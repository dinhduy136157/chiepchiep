"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { motion } from "framer-motion"
import { ArrowLeft, Clock3, Trophy } from "lucide-react"

type Card = {
  id: number
  term: string
  definition: string
}

type MatchItem = {
  gameId: string
  cardId: number
  content: string
  type: "term" | "definition"
}

function shuffleArray<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5)
}

export default function MatchGamePage() {
  const params = useParams<{ id: string }>()
  const setId = params.id
  const supabase = createClient()
  const router = useRouter()

  const [gameCards, setGameCards] = useState<MatchItem[]>([])
  const [selected, setSelected] = useState<MatchItem[]>([])
  const [matchedCardIds, setMatchedCardIds] = useState<number[]>([])
  const [time, setTime] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isWrong, setIsWrong] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data, error: cardError } = await supabase
        .from("cards")
        .select("id, term, definition")
        .eq("set_id", setId)
        .limit(8)

      if (cancelled) return
      if (cardError) {
        setError(cardError.message)
        setLoading(false)
        return
      }

      const rows = (data ?? []) as Card[]
      if (rows.length < 3) {
        setError("Bạn cần ít nhất 3 thẻ để chơi trò ghép cặp.")
        setLoading(false)
        return
      }

      const terms: MatchItem[] = rows.map((c) => ({
        gameId: `t-${c.id}-${Math.random().toString(36).slice(2, 8)}`,
        cardId: c.id,
        content: c.term,
        type: "term",
      }))
      const defs: MatchItem[] = rows.map((c) => ({
        gameId: `d-${c.id}-${Math.random().toString(36).slice(2, 8)}`,
        cardId: c.id,
        content: c.definition,
        type: "definition",
      }))

      setGameCards(shuffleArray([...terms, ...defs]))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [setId, supabase])

  useEffect(() => {
    if (loading || isFinished) return
    const interval = setInterval(() => setTime((prev) => prev + 0.1), 100)
    return () => clearInterval(interval)
  }, [isFinished, loading])

  const totalPairs = useMemo(() => gameCards.length / 2, [gameCards.length])

  const handleSelect = (card: MatchItem) => {
    if (matchedCardIds.includes(card.cardId) || isWrong) return
    if (selected.some((s) => s.gameId === card.gameId)) return

    const nextSelected = [...selected, card]
    setSelected(nextSelected)

    if (nextSelected.length !== 2) return

    const [first, second] = nextSelected
    if (first.cardId === second.cardId && first.type !== second.type) {
      setTimeout(() => {
        const nextMatched = [...matchedCardIds, first.cardId]
        setMatchedCardIds(nextMatched)
        setSelected([])
        if (nextMatched.length === totalPairs) {
          setIsFinished(true)
        }
      }, 180)
      return
    }

    setIsWrong(true)
    setTimeout(() => {
      setSelected([])
      setIsWrong(false)
    }, 520)
  }

  const restart = () => {
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center text-slate-500 dark:text-slate-400">
        Đang chuẩn bị trò chơi...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 p-6 text-center">
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

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-8 text-center"
        >
          <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Hoàn thành ghép cặp</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Bạn đã ghép đúng trong <span className="font-bold text-indigo-600 dark:text-indigo-400">{time.toFixed(1)} giây</span>
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              onClick={restart}
              className="rounded-xl py-2.5 text-white text-sm font-semibold"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              Chơi lại
            </button>
            <button
              onClick={() => router.push(`/dashboard/set/${setId}`)}
              className="rounded-xl py-2.5 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300"
            >
              Về bộ thẻ
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] pb-6">
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between">
            <button
              onClick={() => router.push(`/dashboard/set/${setId}`)}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Ghép cặp</h1>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Clock3 className="w-3.5 h-3.5 text-emerald-500" />
              {time.toFixed(1)}s
            </div>
          </div>
          <div className="pb-3">
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(matchedCardIds.length / totalPairs) * 100}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4">
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-3">
          Chạm 2 ô để ghép thuật ngữ với định nghĩa tương ứng
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {gameCards.map((card) => {
            const isSelected = selected.some((s) => s.gameId === card.gameId)
            const isMatched = matchedCardIds.includes(card.cardId)

            return (
              <motion.button
                key={card.gameId}
                layout
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(card)}
                disabled={isMatched}
                className={`h-28 rounded-2xl px-3 text-sm font-semibold text-center border transition ${
                  isMatched
                    ? "opacity-0 pointer-events-none"
                    : isSelected
                    ? isWrong
                      ? "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100"
                }`}
              >
                {card.content}
              </motion.button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
