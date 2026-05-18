"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { ArrowLeft, CheckCircle2, Shuffle, Sparkles, XCircle } from "lucide-react"
import { motion } from "framer-motion"

type Card = {
  id: number
  term: string
  definition: string
}

// Fisher-Yates shuffle — trả về mảng mới, không mutate
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function LearnPage() {
  const params = useParams<{ id: string }>()
  const setId = params.id
  const supabase = createClient()
  const router = useRouter()

  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInput, setUserInput] = useState("")
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle")
  const [isChecking, setIsChecking] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAndShuffle = async () => {
    setLoading(true)
    setError(null)
    setCurrentIndex(0)
    setUserInput("")
    setStatus("idle")

    const { data: cardRows, error: cardError } = await supabase
      .from("cards")
      .select("id, term, definition")
      .eq("set_id", setId)
      .order("id", { ascending: true })

    if (cardError) {
      setError(cardError.message)
      setLoading(false)
      return
    }

    // Xáo trộn ngay khi nhận về
    setCards(shuffleArray((cardRows ?? []) as Card[]))
    setLoading(false)
  }

  useEffect(() => {
    void loadAndShuffle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId])

  const currentCard = cards[currentIndex]
  const progress = useMemo(() => {
    if (cards.length === 0) return 0
    return Math.round(((currentIndex + 1) / cards.length) * 100)
  }, [cards.length, currentIndex])

  const checkAnswer = async () => {
    if (isChecking || !currentCard) return
    setIsChecking(true)

    const isRight =
      userInput.trim().toLowerCase() === currentCard.term.trim().toLowerCase()

    if (isRight) {
      setStatus("correct")

      const { data: authData } = await supabase.auth.getUser()
      if (authData.user) {
        await supabase.from("learning_progress").upsert(
          {
            user_id: authData.user.id,
            card_id: currentCard.id,
            status: "mastered",
            last_reviewed: new Date().toISOString(),
          },
          { onConflict: "user_id, card_id" }
        )
      }

      setTimeout(() => {
        if (currentIndex < cards.length - 1) {
          setCurrentIndex((prev) => prev + 1)
          setUserInput("")
          setStatus("idle")
          setIsChecking(false)
          return
        }
        // Học xong hết → về trang set
        router.push(`/dashboard/set/${setId}`)
      }, 650)
      return
    }

    setStatus("wrong")
    setIsChecking(false)
  }

  // ── Reshuffle thủ công ───────────────────────────────────
  const handleReshuffle = () => {
    setCards((prev) => shuffleArray(prev))
    setCurrentIndex(0)
    setUserInput("")
    setStatus("idle")
    setIsChecking(false)
  }

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400">Đang xáo trộn bài học...</p>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 p-6 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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

  // ── Empty ────────────────────────────────────────────────
  if (!currentCard) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center p-6">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Bộ thẻ này chưa có nội dung.
          </p>
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

  // ── Main ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] pb-8">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-lg mx-auto px-4">
          <div className="h-14 flex items-center justify-between">
            <button
              onClick={() => router.push(`/dashboard/set/${setId}`)}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <h1
              className="text-lg font-bold tracking-tight text-slate-800 dark:text-white"
              style={{ fontFamily: "var(--font-display, sans-serif)" }}
            >
              Chế độ học
            </h1>

            <div className="flex items-center gap-1.5">
              {/* Reshuffle button */}
              <button
                onClick={handleReshuffle}
                title="Xáo trộn lại"
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-90 transition hover:text-indigo-500"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              {/* Counter */}
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 min-w-[46px] text-center">
                {currentIndex + 1}/{cards.length}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="pb-3">
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.25 }}
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-3">
        {/* Definition card */}
        <motion.section
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-indigo-500 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Định nghĩa
          </div>
          <p className="text-center text-xl font-bold leading-relaxed text-slate-800 dark:text-white min-h-[96px] flex items-center justify-center">
            {currentCard.definition}
          </p>
        </motion.section>

        {/* Input card */}
        <motion.section
          key={`input-${currentIndex}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800"
        >
          <input
            autoFocus
            value={userInput}
            onChange={(e) => {
              setUserInput(e.target.value)
              setStatus("idle")
            }}
            onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
            disabled={isChecking && status === "correct"}
            placeholder="Nhập thuật ngữ tương ứng..."
            className={`w-full rounded-2xl border-2 px-4 py-4 text-center text-lg font-bold outline-none transition ${
              status === "correct"
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                : status === "wrong"
                ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300"
                : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100 focus:border-indigo-400"
            }`}
          />

          {/* Hint khi sai */}
          {status === "wrong" && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-center text-sm text-emerald-600 dark:text-emerald-400 font-semibold"
            >
              💡 Đáp án: <span className="underline underline-offset-2">{currentCard.term}</span>
            </motion.p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => router.push(`/dashboard/set/${setId}`)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300"
            >
              Thoát
            </button>
            <button
              onClick={checkAnswer}
              disabled={isChecking || !userInput.trim()}
              className="rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {status === "correct" ? (
                <span className="inline-flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Chính xác!
                </span>
              ) : status === "wrong" ? (
                <span className="inline-flex items-center justify-center gap-1.5">
                  <XCircle className="w-4 h-4" /> Thử lại
                </span>
              ) : (
                "Kiểm tra"
              )}
            </button>
          </div>
        </motion.section>
      </main>
    </div>
  )
}
