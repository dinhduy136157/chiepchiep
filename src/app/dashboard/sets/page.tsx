"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import AppHeader from "@/components/AppHeader"
import { BookOpen, Plus, Search, Trash2, ChevronRight } from "lucide-react"

type StudySet = {
  id: number
  title: string
  description: string | null
  created_at: string
}

type CardRow = {
  set_id: number
}

export default function SetsManagementPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sets, setSets] = useState<StudySet[]>([])
  const [cardCountBySet, setCardCountBySet] = useState<Record<number, number>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [userName, setUserName] = useState("User")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single()

      if (!cancelled && profile) {
        setUserName(profile.username || user.email?.split("@")[0] || "User")
        setAvatarUrl(profile.avatar_url)
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
          const counts: Record<number, number> = {}
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

  const handleDelete = async (setId: number) => {
    const ok = window.confirm("Delete this study set? This action cannot be undone.")
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <AppHeader pageTitle="Manage Study Sets" avatarUrl={avatarUrl} userName={userName} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">All My Study Sets</h1>
            <p className="text-slate-500 mt-1">Create, open, and clean up your learning library.</p>
          </div>
          <Link
            href="/dashboard/create"
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            New Study Set
          </Link>
        </div>

        <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search your sets..."
            className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-3">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="animate-pulse bg-white rounded-xl border border-slate-200 p-5">
                <div className="h-5 bg-slate-200 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-slate-100 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredSets.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-slate-700 mb-2">No study set found</h2>
            <p className="text-sm text-slate-500 mb-4">Try another keyword, or create a new set.</p>
            <Link
              href="/dashboard/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Create Set
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredSets.map((setItem) => (
              <div
                key={setItem.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-200 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-slate-800 truncate">{setItem.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                      {setItem.description || "No description"}
                    </p>
                    <div className="mt-2 text-xs text-slate-400 flex items-center gap-3">
                      <span>{cardCountBySet[setItem.id] ?? 0} cards</span>
                      <span>{new Date(setItem.created_at).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/set/${setItem.id}`}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
                    >
                      Open
                      <ChevronRight className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => handleDelete(setItem.id)}
                      disabled={deletingId === setItem.id}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deletingId === setItem.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
