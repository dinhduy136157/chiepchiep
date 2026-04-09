"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Check, X, Trophy, ArrowLeft, RotateCcw } from "lucide-react"
import { motion } from "framer-motion"

type Card = {
  id: number
  term: string
  definition: string
}

type TestType = "en-vi" | "vi-en"
type QuestionMeta = {
  testType: TestType
  options: Card[]
}

function shuffleArray<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5)
}

export default function TestPage() {
  const params = useParams<{ id: string }>()
  const setId = params.id
  const supabase = createClient()
  const router = useRouter()

  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [questionMeta, setQuestionMeta] = useState<QuestionMeta[]>([])
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data, error: cardError } = await supabase
        .from("cards")
        .select("id, term, definition")
        .eq("set_id", setId)

      if (cancelled) return
      if (cardError) {
        setError(cardError.message)
        setLoading(false)
        return
      }

      const rows = (data ?? []) as Card[]
      if (rows.length < 4) {
        setError("Bạn cần ít nhất 4 thẻ để bắt đầu bài kiểm tra.")
        setLoading(false)
        return
      }

      const shuffledRows = shuffleArray(rows)
      const generatedMeta: QuestionMeta[] = shuffledRows.map((currentCard) => {
        const otherCards = shuffledRows.filter((c) => c.id !== currentCard.id)
        const distractors = shuffleArray(otherCards).slice(0, 3)
        const nextType: TestType = Math.random() > 0.5 ? "vi-en" : "en-vi"
        return {
          testType: nextType,
          options: shuffleArray([currentCard, ...distractors]),
        }
      })

      setCards(shuffledRows)
      setQuestionMeta(generatedMeta)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [setId, supabase])

  const progress = useMemo(() => {
    if (cards.length === 0) return 0
    return ((currentIndex + 1) / cards.length) * 100
  }, [cards.length, currentIndex])

  const handleSelect = (option: Card) => {
    if (selectedAnswer || cards.length === 0) return

    const currentMeta = questionMeta[currentIndex]
    if (!currentMeta) return
    const current = cards[currentIndex]
    const correctValue =
      currentMeta.testType === "vi-en" ? current.term : current.definition
    const selectedValue =
      currentMeta.testType === "vi-en" ? option.term : option.definition

    setSelectedAnswer(selectedValue)
    const right = selectedValue === correctValue
    setIsCorrect(right)
    if (right) setScore((prev) => prev + 1)

    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex((prev) => prev + 1)
        setSelectedAnswer(null)
        setIsCorrect(null)
      } else {
        setIsFinished(true)
      }
    }, 900)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center text-slate-500 dark:text-slate-400">
        Đang tải bài kiểm tra...
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
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-8 text-center"
        >
          <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Hoàn thành bài kiểm tra</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Kết quả của bạn</p>
          <p className="mt-2 text-5xl font-black text-indigo-600 dark:text-indigo-400">
            {score}
            <span className="text-3xl text-slate-300 dark:text-slate-600">/{cards.length}</span>
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl py-2.5 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              <RotateCcw className="w-4 h-4" />
              Làm lại
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

  const current = cards[currentIndex]
  const currentMeta = questionMeta[currentIndex]
  if (!currentMeta) return null
  const prompt = currentMeta.testType === "vi-en" ? current.definition : current.term

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
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Kiểm tra nhanh</h1>
            <div className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {currentIndex + 1}/{cards.length}
            </div>
          </div>
          <div className="pb-3">
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 mb-3 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-500">Chọn đáp án đúng</p>
          <h2 className="mt-4 text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-relaxed">
            {prompt}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {currentMeta.options.map((option, idx) => {
            const optionValue =
              currentMeta.testType === "vi-en" ? option.term : option.definition
            const correctValue =
              currentMeta.testType === "vi-en" ? current.term : current.definition

            let buttonStyle =
              "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100"

            if (selectedAnswer === optionValue) {
              buttonStyle = isCorrect
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "bg-rose-500 border-rose-500 text-white"
            } else if (selectedAnswer && optionValue === correctValue) {
              buttonStyle = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 text-emerald-700 dark:text-emerald-300"
            }

            return (
              <motion.button
                key={`${option.id}-${idx}`}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(option)}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-left font-semibold transition flex items-center justify-between gap-3 ${buttonStyle}`}
              >
                <span>{optionValue}</span>
                {selectedAnswer === optionValue ? (
                  isCorrect ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />
                ) : null}
              </motion.button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
