"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Plus,
  Save,
  Trash2,
} from "lucide-react"

type CardInput = {
  term: string
  definition: string
}

function progressPercent(total: number, valid: number) {
  if (!total) return 0
  return Math.min(100, Math.round((valid / total) * 100))
}

export default function CreateSetPage() {
  const supabase = createClient()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [cards, setCards] = useState<CardInput[]>([{ term: "", definition: "" }])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/auth/login")
        return
      }

      if (!cancelled) setLoading(false)
    }

    checkSession()
    return () => {
      cancelled = true
    }
  }, [router, supabase])

  const filledCards = useMemo(
    () => cards.filter((card) => card.term.trim() && card.definition.trim()),
    [cards]
  )

  const percent = useMemo(
    () => progressPercent(cards.length, filledCards.length),
    [cards.length, filledCards.length]
  )

  const addRow = () => {
    setCards((prev) => [...prev, { term: "", definition: "" }])
  }

  const removeRow = (index: number) => {
    if (cards.length === 1) return
    setCards((prev) => prev.filter((_, i) => i !== index))
  }

  const updateCard = (index: number, field: keyof CardInput, value: string) => {
    setCards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, [field]: value } : card))
    )
  }

  const handleSave = async () => {
    setError(null)

    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề học phần.")
      return
    }

    if (filledCards.length === 0) {
      setError("Hãy thêm ít nhất 1 thẻ hợp lệ trước khi lưu.")
      return
    }

    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError("Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.")
      setSaving(false)
      return
    }

    const { data: setData, error: createSetError } = await supabase
      .from("study_sets")
      .insert([
        {
          title: title.trim(),
          description: description.trim(),
          author_id: user.id,
        },
      ])
      .select("id")
      .single()

    if (createSetError || !setData) {
      setError(createSetError?.message ?? "Không thể tạo học phần.")
      setSaving(false)
      return
    }

    const cardsToInsert = filledCards.map((card) => ({
      term: card.term.trim(),
      definition: card.definition.trim(),
      set_id: setData.id,
    }))

    const { error: cardError } = await supabase.from("cards").insert(cardsToInsert)

    if (cardError) {
      setError(cardError.message)
      setSaving(false)
      return
    }

    router.push(`/dashboard/set/${setData.id}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] pb-8">
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-lg mx-auto px-4">
          <div className="h-14 flex items-center justify-between">
            <Link
              href="/dashboard"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1
              className="text-lg font-bold tracking-tight text-slate-800 dark:text-white"
              style={{ fontFamily: "var(--font-display, sans-serif)" }}
            >
              Tạo học phần mới
            </h1>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="h-9 px-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
          <div className="pb-3">
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.2 }}
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              Hoàn thành {filledCards.length}/{cards.length} thẻ
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-3">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Thông tin học phần
            </h2>
          </div>
          <div className="space-y-2.5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề (VD: IELTS 3000 từ)"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400"
            />
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn (tùy chọn)"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 resize-none"
            />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Danh sách thẻ
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              {filledCards.length} hợp lệ
            </span>
          </div>

          <div className="space-y-2.5">
            {cards.map((card, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Thẻ {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={cards.length === 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <input
                    value={card.term}
                    onChange={(e) => updateCard(index, "term", e.target.value)}
                    placeholder="Thuật ngữ"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400"
                  />
                  <input
                    value={card.definition}
                    onChange={(e) => updateCard(index, "definition", e.target.value)}
                    placeholder="Định nghĩa"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="mt-3 w-full rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Thêm thẻ mới
          </button>
        </motion.section>

        {filledCards.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3"
          >
            <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Sẵn sàng lưu {filledCards.length} thẻ vào học phần.
            </p>
          </motion.section>
        )}

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full rounded-xl py-3.5 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Save className="w-4 h-4" />
          {saving ? "Đang lưu học phần..." : "Lưu học phần"}
        </button>
      </main>
    </div>
  )
}
