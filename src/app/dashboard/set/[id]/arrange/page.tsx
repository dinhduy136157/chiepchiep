"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
  buildLetterTiles,
  checkArrangedAnswer,
  shuffleLetterTiles,
  type LetterTile,
} from "@/utils/letterArrange"
import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle2, RotateCcw, Shuffle, XCircle } from "lucide-react"

type Card = {
  id: number
  term: string
  definition: string
}

type AnswerStatus = "idle" | "correct" | "wrong"

export default function ArrangeLettersPage() {
  const params = useParams<{ id: string }>()
  const setId = params.id
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [availableTiles, setAvailableTiles] = useState<LetterTile[]>([])
  const [answerTiles, setAnswerTiles] = useState<LetterTile[]>([])
  const [status, setStatus] = useState<AnswerStatus>("idle")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentCard = cards[currentIndex]
  const progress = cards.length === 0 ? 0 : Math.round(((currentIndex + 1) / cards.length) * 100)

  const resetExercise = useCallback((term: string) => {
    const tiles = buildLetterTiles(term)
    setAvailableTiles(shuffleLetterTiles(tiles))
    setAnswerTiles([])
    setStatus("idle")
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: cardError } = await supabase
      .from("cards")
      .select("id, term, definition")
      .eq("set_id", setId)
      .order("id", { ascending: true })

    if (cardError) {
      setError(cardError.message)
      setLoading(false)
      return
    }

    const rows = (data ?? []) as Card[]
    if (rows.length === 0) {
      setError("Bộ thẻ này chưa có nội dung.")
      setLoading(false)
      return
    }

    setCards(rows)
    setCurrentIndex(0)
    resetExercise(rows[0].term)
    setLoading(false)
  }, [resetExercise, setId, supabase])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  const pickTile = (tile: LetterTile) => {
    setAvailableTiles((prev) => prev.filter((item) => item.id !== tile.id))
    setAnswerTiles((prev) => [...prev, tile])
    setStatus("idle")
  }

  const removeTile = (tile: LetterTile) => {
    setAnswerTiles((prev) => prev.filter((item) => item.id !== tile.id))
    setAvailableTiles((prev) => [...prev, tile])
    setStatus("idle")
  }

  const goToCard = (nextIndex: number) => {
    const nextCard = cards[nextIndex]
    if (!nextCard) return
    setCurrentIndex(nextIndex)
    resetExercise(nextCard.term)
  }

  const checkAnswer = async () => {
    if (!currentCard) return
    const isCorrect = checkArrangedAnswer(answerTiles, currentCard.term)
    setStatus(isCorrect ? "correct" : "wrong")

    if (!isCorrect) return

    const { data: authData } = await supabase.auth.getUser()
    if (authData.user) {
      await supabase.from("learning_progress").upsert(
        {
          user_id: authData.user.id,
          card_id: currentCard.id,
          status: "mastered",
          last_reviewed: new Date().toISOString(),
        },
        { onConflict: "user_id,card_id" }
      )
    }
  }

  const nextCard = () => {
    if (cards.length === 0) return
    goToCard((currentIndex + 1) % cards.length)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center text-slate-500 dark:text-slate-400">
        Đang chuẩn bị bài sắp xếp chữ cái...
      </div>
    )
  }

  if (error || !currentCard) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 p-6 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error ?? "Không tìm thấy thẻ hiện tại."}</p>
          <button
            onClick={() => router.push(`/dashboard/set/${setId}`)}
            className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            Quay lại bộ thẻ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] pb-8">
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between">
            <button
              onClick={() => router.push(`/dashboard/set/${setId}`)}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Sắp xếp chữ cái</h1>
            <div className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {currentIndex + 1}/{cards.length}
            </div>
          </div>
          <div className="pb-3">
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        <motion.section
          key={currentCard.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 text-center"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-500">
            Định nghĩa
          </p>
          <h2 className="mt-4 min-h-[86px] flex items-center justify-center text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-relaxed">
            {currentCard.definition}
          </h2>
        </motion.section>

        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4">
          <div
            className={`min-h-20 rounded-2xl border-2 border-dashed px-3 py-4 text-center transition ${
              status === "correct"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                : status === "wrong"
                ? "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            {answerTiles.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                {answerTiles.map((tile) => (
                  <button
                    key={tile.id}
                    onClick={() => removeTile(tile)}
                    className="min-h-10 min-w-10 rounded-xl bg-white px-3 text-lg font-black shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
                  >
                    {tile.value}
                  </button>
                ))}
              </div>
            ) : (
              <span className="inline-flex min-h-10 items-center text-sm font-semibold text-slate-400">
                Chọn chữ cái để ghép thuật ngữ
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {availableTiles.map((tile) => (
              <button
                key={tile.id}
                onClick={() => pickTile(tile)}
                className="min-h-11 min-w-11 rounded-xl border border-slate-200 bg-white px-3 text-lg font-black text-slate-700 shadow-sm transition active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {tile.value}
              </button>
            ))}
          </div>

          {status !== "idle" && (
            <p
              className={`mt-4 text-center text-sm font-semibold ${
                status === "correct"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {status === "correct" ? (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Chính xác!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> Chưa đúng, thử lại nhé
                </span>
              )}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (answerTiles.length === 0) return
                removeTile(answerTiles[answerTiles.length - 1])
              }}
              disabled={answerTiles.length === 0}
              className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-50"
            >
              Xóa chữ
            </button>
            <button
              onClick={checkAnswer}
              disabled={answerTiles.length === 0}
              className="rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              Kiểm tra
            </button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => resetExercise(currentCard.term)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Làm lại
          </button>
          <button
            onClick={nextCard}
            className="rounded-xl py-2.5 text-sm font-semibold text-white inline-flex items-center justify-center gap-1.5"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <Shuffle className="w-4 h-4" />
            Thẻ tiếp
          </button>
        </div>
      </main>
    </div>
  )
}
