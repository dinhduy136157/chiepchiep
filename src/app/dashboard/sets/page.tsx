"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Home,
  Library,
  Plus,
  Search,
  Trash2,
  UserCircle2,
  Users,
} from "lucide-react"

type StudySet = {
  id: string
  title: string
  description: string | null
  created_at: string
}

type CardRow = {
  set_id: string
}

function BottomNav() {
  const items = [
    { key: "home", icon: Home, label: "Trang chủ", href: "/dashboard" },
    { key: "sets", icon: Library, label: "Học phần", href: "/dashboard/sets" },
    { key: "groups", icon: Users, label: "Nhóm", href: "/dashboard/groups" },
    { key: "profile", icon: UserCircle2, label: "Hồ sơ", href: "/dashboard/profile" },
  ] as const

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 pb-safe">
      {items.map((item) => {
        const isActive = item.key === "sets"
        const Icon = item.icon
        return (
          <Link key={item.key} href={item.href} className="flex-1">
            <div className={`flex flex-col items-center gap-1 py-2.5 transition-all duration-150 ${isActive ? "" : "opacity-50"}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? "bg-indigo-100 dark:bg-indigo-900/50" : ""}`}>
                <Icon className={`w-[18px] h-[18px] ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"}`} />
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`}>
                {item.label}
              </span>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}

export default function SetsManagementPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sets, setSets] = useState<StudySet[]>([])
  const [cardCountBySet, setCardCountBySet] = useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/auth/login")
        return
      }

      const { data: setRows, error: setRowsError } = await supabase
        .from("study_sets")
        .select("id, title, description, created_at")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false })

      if (setRowsError) {
        if (!cancelled) {
          setError(setRowsError.message)
          setLoading(false)
        }
        return
      }

      const safeSets = (setRows ?? []) as StudySet[]
      if (!cancelled) setSets(safeSets)

      const setIds = safeSets.map((s) => s.id)
      if (setIds.length === 0) {
        if (!cancelled) {
          setCardCountBySet({})
          setLoading(false)
        }
        return
      }

      const { data: cardRows, error: cardError } = await supabase
        .from("cards")
        .select("set_id")
        .in("set_id", setIds)

      if (!cancelled) {
        if (cardError) {
          setError(cardError.message)
        } else {
          const counts: Record<string, number> = {}
          ;((cardRows ?? []) as CardRow[]).forEach((row) => {
            counts[row.set_id] = (counts[row.set_id] ?? 0) + 1
          })
          setCardCountBySet(counts)
        }
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [router, supabase])

  const filteredSets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return sets
    return sets.filter((s) => {
      const title = s.title.toLowerCase()
      const description = s.description?.toLowerCase() ?? ""
      return title.includes(q) || description.includes(q)
    })
  }, [sets, searchTerm])

  const handleDelete = async (setId: string) => {
    const ok = window.confirm("Bạn có chắc muốn xóa học phần này không? Hành động này không thể hoàn tác.")
    if (!ok) return

    setDeletingId(setId)
    const { error: deleteError } = await supabase.from("study_sets").delete().eq("id", setId)
    if (deleteError) {
      setError(deleteError.message)
      setDeletingId(null)
      return
    }

    setSets((prev) => prev.filter((s) => s.id !== setId))
    setCardCountBySet((prev) => {
      const next = { ...prev }
      delete next[setId]
      return next
    })
    setDeletingId(null)
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] pb-[90px]">
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
                className="text-xl font-bold tracking-tight"
                style={{
                  fontFamily: "var(--font-display, sans-serif)",
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Học phần của tôi
              </h1>
              <Link
                href="/dashboard/create"
                className="h-9 px-3 rounded-xl text-white text-sm font-semibold inline-flex items-center gap-1.5 active:scale-95 transition"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                <Plus className="w-4 h-4" />
                Tạo mới
              </Link>
            </div>
            <div className="pb-3">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm học phần..."
                  className="bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200 w-full placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 pt-4 space-y-3">
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, idx) => (
                <div
                  key={idx}
                  className="animate-pulse rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4"
                >
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2 mb-3" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : filteredSets.length === 0 ? (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-7 h-7 text-indigo-400" />
              </div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Không tìm thấy học phần
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Thử từ khóa khác hoặc tạo học phần mới.
              </p>
              <Link
                href="/dashboard/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                <Plus className="w-4 h-4" />
                Tạo học phần
              </Link>
            </motion.section>
          ) : (
            <div className="space-y-2">
              {filteredSets.map((setItem, index) => (
                <motion.div
                  key={setItem.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-xl flex-shrink-0">
                      📘
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {setItem.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {setItem.description || "Chưa có mô tả."}
                      </p>
                      <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-3">
                        <span>{cardCountBySet[setItem.id] ?? 0} thẻ</span>
                        <span>{new Date(setItem.created_at).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      href={`/dashboard/set/${setItem.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      Mở
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(setItem.id)}
                      disabled={deletingId === setItem.id}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deletingId === setItem.id ? "Đang xóa..." : "Xóa"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      <BottomNav />
    </>
  )
}
