"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { markSetViewed } from "@/utils/recentSets"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileText,
  LayoutGrid,
  Plus,
  Send,
  Sparkles,
  X,
} from "lucide-react"

type Card = {
  id: number
  term: string
  definition: string
  set_id: string
}

type Mode = "flashcards" | "learn" | "test" | "match" | "flashcards-full"

function ModeButton({
  label,
  active,
  icon,
  onClick,
}: {
  label: string
  active: boolean
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition ${
        active
          ? "text-white border-transparent"
          : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700"
      }`}
      style={active ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : {}}
    >
      {icon}
      {label}
    </button>
  )
}

export default function SetDetailPage() {
  const params = useParams<{ id: string }>()
  const setId = params.id
  const supabase = createClient()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [cards, setCards] = useState<Card[]>([])
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<Mode>("flashcards")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const [isAdding, setIsAdding] = useState(false)
  const [newTerm, setNewTerm] = useState("")
  const [newDefinition, setNewDefinition] = useState("")
  const [savingCard, setSavingCard] = useState(false)

  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkText, setBulkText] = useState("")

  useEffect(() => {
    if (setId) markSetViewed(setId)
  }, [setId])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace("/auth/login")
      return
    }

    const [{ data: setRow, error: setRowError }, { data: cardRows, error: cardRowsError }, { data: progressRows }] =
      await Promise.all([
        supabase.from("study_sets").select("title, description").eq("id", setId).single(),
        supabase.from("cards").select("id, term, definition, set_id").eq("set_id", setId).order("id", { ascending: true }),
        supabase.from("learning_progress").select("card_id").eq("user_id", user.id).eq("status", "mastered"),
      ])

    if (setRowError) {
      setError(setRowError.message)
      setLoading(false)
      return
    }
    if (cardRowsError) {
      setError(cardRowsError.message)
      setLoading(false)
      return
    }

    setTitle(setRow?.title ?? "")
    setDescription(setRow?.description ?? "")
    setCards((cardRows ?? []) as Card[])
    setMasteredIds(new Set((progressRows ?? []).map((row) => row.card_id)))
    setCurrentIndex(0)
    setLoading(false)
  }, [router, setId, supabase])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  const currentCard = cards[currentIndex]
  const progress = cards.length === 0 ? 0 : Math.round((masteredIds.size / cards.length) * 100)

  const toggleMastered = useCallback(
    async (cardId: number) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const wasMastered = masteredIds.has(cardId)
      const next = new Set(masteredIds)
      if (wasMastered) next.delete(cardId)
      else next.add(cardId)
      setMasteredIds(next)

      await supabase.from("learning_progress").upsert(
        {
          user_id: user.id,
          card_id: cardId,
          status: wasMastered ? "learning" : "mastered",
          last_reviewed: new Date().toISOString(),
        },
        { onConflict: "user_id,card_id" }
      )
    },
    [masteredIds, supabase]
  )

  const addCard = async () => {
    if (!newTerm.trim() || !newDefinition.trim()) return
    setSavingCard(true)

    const { data, error: insertError } = await supabase
      .from("cards")
      .insert([{ set_id: setId, term: newTerm.trim(), definition: newDefinition.trim() }])
      .select("id, term, definition, set_id")

    if (!insertError && data) {
      setCards((prev) => [...prev, ...(data as Card[])])
      setNewTerm("")
      setNewDefinition("")
      setIsAdding(false)
    }
    setSavingCard(false)
  }

  const handleBulkImport = async () => {
    const rows = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [term, ...rest] = line.split(",")
        const definition = rest.join(",").trim()
        if (!term?.trim() || !definition) return null
        return { set_id: setId, term: term.trim(), definition }
      })
      .filter(Boolean) as { set_id: string; term: string; definition: string }[]

    if (rows.length === 0) return

    setSavingCard(true)
    const { data, error: importError } = await supabase
      .from("cards")
      .insert(rows)
      .select("id, term, definition, set_id")
    if (!importError && data) {
      setCards((prev) => [...prev, ...(data as Card[])])
      setBulkText("")
      setShowBulkModal(false)
    }
    setSavingCard(false)
  }

  const openMode = (nextMode: Mode) => {
    if (nextMode === "flashcards") {
      setMode("flashcards")
      return
    }
    router.push(`/dashboard/set/${setId}/${nextMode === "flashcards-full" ? "flashcards" : nextMode}`)
  }

  const cardCounterText = useMemo(() => {
    if (cards.length === 0) return "0/0"
    return `${currentIndex + 1}/${cards.length}`
  }, [cards.length, currentIndex])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center text-slate-500 dark:text-slate-400">
        Đang tải dữ liệu...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] pb-6">
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-lg mx-auto px-4">
          <div className="h-14 flex items-center justify-between">
            <Link
              href="/dashboard/sets"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <p className="text-sm font-bold truncate max-w-[55%] text-slate-800 dark:text-white">{title}</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowBulkModal(true)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center"
              >
                <FileDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsAdding((v) => !v)}
                className="w-9 h-9 rounded-xl text-white flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="pb-3">
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-3">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <h1 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description || "Chưa có mô tả."}</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-2">
            {masteredIds.size}/{cards.length} thẻ đã thuộc ({progress}%)
          </p>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <ModeButton label="Thẻ" active={mode === "flashcards"} icon={<BookOpen className="w-3.5 h-3.5" />} onClick={() => openMode("flashcards")} />
          <ModeButton label="Flashcards" active={false} icon={<Sparkles className="w-3.5 h-3.5" />} onClick={() => openMode("flashcards-full")} />
          <ModeButton label="Học" active={false} icon={<Brain className="w-3.5 h-3.5" />} onClick={() => openMode("learn")} />
          <ModeButton label="Kiểm tra" active={false} icon={<FileText className="w-3.5 h-3.5" />} onClick={() => openMode("test")} />
          <ModeButton label="Ghép cặp" active={false} icon={<LayoutGrid className="w-3.5 h-3.5" />} onClick={() => openMode("match")} />
        </div>

        {cards.length > 0 ? (
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Thẻ {cardCounterText}</span>
              <button
                onClick={() => {
                  setCurrentIndex(Math.floor(Math.random() * cards.length))
                  setFlipped(false)
                }}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400"
              >
                Xáo trộn
              </button>
            </div>

            <button
              onClick={() => setFlipped((v) => !v)}
              className="w-full min-h-[180px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5 text-left"
            >
              <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">{flipped ? "Định nghĩa" : "Thuật ngữ"}</p>
              <p className={`font-bold ${flipped ? "text-lg text-indigo-700 dark:text-indigo-300" : "text-2xl text-slate-800 dark:text-white"}`}>
                {flipped ? currentCard?.definition : currentCard?.term}
              </p>
            </button>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)
                  setFlipped(false)
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center justify-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Trước
              </button>
              <button
                onClick={() => currentCard && void toggleMastered(currentCard.id)}
                className={`rounded-xl py-2 text-sm font-semibold inline-flex items-center justify-center gap-1 ${
                  currentCard && masteredIds.has(currentCard.id)
                    ? "bg-emerald-500 text-white"
                    : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                <Check className="w-4 h-4" />
                {currentCard && masteredIds.has(currentCard.id) ? "Đã thuộc" : "Đánh dấu"}
              </button>
              <button
                onClick={() => {
                  setCurrentIndex((prev) => (prev + 1) % cards.length)
                  setFlipped(false)
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center justify-center gap-1"
              >
                Sau
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        ) : (
          <section className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có thẻ nào trong học phần này.</p>
          </section>
        )}

        {isAdding && (
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Thêm thẻ mới</p>
            <div className="space-y-2.5">
              <input
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Thuật ngữ"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none"
              />
              <input
                value={newDefinition}
                onChange={(e) => setNewDefinition(e.target.value)}
                placeholder="Định nghĩa"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsAdding(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  onClick={addCard}
                  disabled={savingCard || !newTerm.trim() || !newDefinition.trim()}
                  className="rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                >
                  <Send className="w-4 h-4" />
                  {savingCard ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Danh sách từ vựng</p>
            <span className="text-xs text-slate-400">{cards.length} thẻ</span>
          </div>
          <div className="p-3 space-y-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`rounded-xl border p-3 flex items-center gap-3 ${
                  masteredIds.has(card.id)
                    ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-900/20"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                }`}
              >
                <button
                  onClick={() => void toggleMastered(card.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    masteredIds.has(card.id) ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 dark:border-slate-600 text-transparent"
                  }`}
                >
                  <Check className="w-3 h-3" />
                </button>
                <div className="flex-1 grid grid-cols-2 gap-2 text-sm min-w-0">
                  <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{card.term}</p>
                  <p className="text-slate-500 dark:text-slate-400 truncate">{card.definition}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {showBulkModal && (
        <div className="fixed inset-0 z-50 p-4 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-bold text-slate-800 dark:text-white">Nhập thẻ hàng loạt</p>
              <button onClick={() => setShowBulkModal(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Mỗi dòng theo định dạng: `thuật ngữ, định nghĩa`</p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full h-52 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none resize-none"
              placeholder={`Meticulous, Tỉ mỉ cẩn thận\nEloquent, Hùng hồn lưu loát`}
            />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => setShowBulkModal(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300"
              >
                Hủy
              </button>
              <button
                onClick={handleBulkImport}
                disabled={savingCard || !bulkText.trim()}
                className="rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                {savingCard ? "Đang xử lý..." : "Nhập thẻ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
