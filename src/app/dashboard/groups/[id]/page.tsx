"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { resolveAvatarUrl } from "@/utils/avatar"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Plus,
  Share2,
  Users,
  X,
} from "lucide-react"

type Group = {
  id: string
  name: string
  description: string | null
}

type Member = {
  user_id: string
  role: string
  profiles?: {
    username?: string | null
    avatar_url?: string | null
  } | null
}

type StudySet = {
  id: string
  title: string
  description: string | null
}

type SharedSetCard = {
  id: number
  learning_progress?: { user_id: string; status: string }[] | null
}

type SharedSet = StudySet & {
  cards?: SharedSetCard[]
}

type SharedSetRelationRow = {
  study_sets: SharedSet | SharedSet[] | null
}

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>()
  const groupId = params.id
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [sharedSets, setSharedSets] = useState<SharedSet[]>([])
  const [mySets, setMySets] = useState<StudySet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

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
      if (!cancelled) setUserId(user.id)

      const [{ data: groupData, error: groupError }, { data: memberRows, error: memberError }, { data: mySetRows, error: mySetError }, { data: sharedRows, error: sharedError }] =
        await Promise.all([
          supabase.from("groups").select("id, name, description").eq("id", groupId).single(),
          supabase
            .from("group_members")
            .select("user_id, role, profiles:user_id ( username, avatar_url )")
            .eq("group_id", groupId),
          supabase.from("study_sets").select("id, title, description").eq("author_id", user.id),
          supabase
            .from("group_study_sets")
            .select(
              "study_sets ( id, title, description, cards ( id, learning_progress ( user_id, status ) ) )"
            )
            .eq("group_id", groupId),
        ])

      if (cancelled) return

      if (groupError) setError(groupError.message)
      if (memberError) setError(memberError.message)
      if (mySetError) setError(mySetError.message)
      if (sharedError) setError(sharedError.message)

      setGroup(groupData ?? null)

      const normalizedMembers: Member[] = (memberRows ?? []).map((member) => {
        const profileValue = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
        return {
          user_id: member.user_id,
          role: member.role,
          profiles: profileValue ?? null,
        }
      })
      setMembers(normalizedMembers)
      setMySets((mySetRows ?? []) as StudySet[])

      const normalizedSharedSets: SharedSet[] = ((sharedRows ?? []) as SharedSetRelationRow[]).flatMap((item) => {
        if (!item.study_sets) return []
        return Array.isArray(item.study_sets) ? item.study_sets : [item.study_sets]
      })
      setSharedSets(normalizedSharedSets)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [groupId, router, supabase])

  const handleShareSet = async (setId: string) => {
    const selectedSet = mySets.find((set) => String(set.id) === String(setId))
    if (!selectedSet) return

    const { error: insertError } = await supabase
      .from("group_study_sets")
      .insert([{ group_id: groupId, set_id: setId }])
    if (insertError) {
      setError("Học phần này đã có trong nhóm hoặc không thể chia sẻ.")
      return
    }

    setSharedSets((prev) => {
      if (prev.some((set) => set.id === selectedSet.id)) return prev
      return [...prev, { ...selectedSet, cards: [] }]
    })
    setShowShareModal(false)
  }

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
              href="/dashboard/groups"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <p className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[55%]">{group?.name || "Nhóm học"}</p>
            <button
              onClick={() => setShowShareModal(true)}
              className="h-9 px-3 rounded-xl text-white text-sm font-semibold inline-flex items-center gap-1.5"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              <Share2 className="w-4 h-4" />
              Chia sẻ
            </button>
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
          <h1 className="text-lg font-bold text-slate-800 dark:text-white">{group?.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{group?.description || "Cùng nhau học tập mỗi ngày."}</p>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {members.length} thành viên</span>
            <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {sharedSets.length} học phần</span>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Học phần đã chia sẻ</p>
            <button onClick={() => setShowShareModal(true)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              Thêm
            </button>
          </div>

          <div className="p-3 space-y-2.5">
            {sharedSets.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có học phần nào được chia sẻ.</p>
              </div>
            ) : (
              sharedSets.map((set, index) => (
                <motion.div
                  key={set.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{set.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{set.description || "Chưa có mô tả."}</p>
                    </div>
                    <Link
                      href={`/dashboard/set/${set.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                    >
                      Mở
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="mt-2.5 space-y-2">
                    {members.map((member) => {
                      const totalCards = set.cards?.length || 0
                      const masteredCount =
                        set.cards?.filter((card) =>
                          card.learning_progress?.some(
                            (lp) => lp.user_id === member.user_id && lp.status === "mastered"
                          )
                        ).length || 0
                      const percent = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0
                      const displayName =
                        member.profiles?.username || (member.user_id === userId ? "Bạn" : member.user_id.slice(0, 6))

                      return (
                        <div key={member.user_id} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 px-2.5 py-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={resolveAvatarUrl(member.profiles?.avatar_url)}
                                alt={displayName}
                                className="w-6 h-6 rounded-full object-cover"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).src = "/avatars/avatar-anh-meo-cute-5.jpg"
                                }}
                              />
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{displayName}</p>
                            </div>
                            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">{percent}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </main>

      {showShareModal && (
        <div className="fixed inset-0 z-50 p-4 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-bold text-slate-800 dark:text-white">Chia sẻ học phần vào nhóm</p>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {mySets.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                  Bạn chưa có học phần nào để chia sẻ.
                </div>
              ) : (
                mySets.map((set) => (
                  <button
                    key={set.id}
                    onClick={() => void handleShareSet(set.id)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-left px-3 py-2.5 hover:border-indigo-300 transition"
                  >
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{set.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{set.description || "Không có mô tả."}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
