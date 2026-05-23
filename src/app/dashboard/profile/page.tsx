"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { loadProfile, requireCurrentUser } from "@/utils/supabase/domain"
import { resolveAvatarUrl } from "@/utils/avatar"
import { motion } from "framer-motion"
import {
  Home,
  Library,
  Users,
  UserCircle2,
  Flame,
  Trophy,
  BookOpen,
  LogOut,
  Save,
  Plus,
  ChevronRight,
} from "lucide-react"

type UserStreakRow = {
  CurrentStreak: number
  LongestStreak: number
}

function StatCard({
  icon: Icon,
  value,
  label,
  iconClassName,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: number | string
  label: string
  iconClassName?: string
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
          {label}
        </span>
        <Icon className={`w-4 h-4 ${iconClassName ?? "text-slate-400 dark:text-slate-500"}`} />
      </div>
      <p
        className="text-2xl font-bold text-slate-800 dark:text-white leading-none"
        style={{ fontFamily: "var(--font-display, sans-serif)", letterSpacing: "-0.5px" }}
      >
        {value}
      </p>
    </div>
  )
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
        const isActive = item.key === "profile"
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

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [username, setUsername] = useState("Người dùng")
  const [usernameInput, setUsernameInput] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [setCount, setSetCount] = useState(0)
  const [groupCount, setGroupCount] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const user = await requireCurrentUser(supabase).catch(() => null)
      if (!user) {
        router.replace("/auth/login")
        return
      }

      if (!cancelled) {
        setUserId(user.id)
        setEmail(user.email ?? "")
        setCreatedAt(user.created_at ?? null)
      }

      const [
        { count: setsCount, error: setsError },
        { count: groupsCount, error: groupsError },
        { data: streak, error: streakError },
      ] = await Promise.all([
        supabase.from("study_sets").select("id", { count: "exact", head: true }).eq("author_id", user.id),
        supabase.from("group_members").select("group_id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("UserStreaks").select("CurrentStreak, LongestStreak").eq("UserId", user.id).maybeSingle<UserStreakRow>(),
      ])
      const profile = await loadProfile(supabase, user.id)

      if (cancelled) return

      if (setsError) setError(setsError.message)
      if (groupsError) setError(groupsError.message)
      if (streakError) setError(streakError.message)

      const displayName = profile?.username || user.email?.split("@")[0] || "Người dùng"
      setUsername(displayName)
      setUsernameInput(displayName)
      setAvatarUrl(profile?.avatar_url || null)
      setSetCount(setsCount ?? 0)
      setGroupCount(groupsCount ?? 0)
      setCurrentStreak(streak?.CurrentStreak ?? 0)
      setLongestStreak(streak?.LongestStreak ?? 0)
      setLoading(false)
    }

    load().catch((loadError) => {
      if (!cancelled) {
        setError(loadError instanceof Error ? loadError.message : "Không thể tải hồ sơ.")
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [router, supabase])

  const initials = useMemo(() => {
    const first = username.trim().slice(0, 2)
    return first ? first.toUpperCase() : "U"
  }, [username])

  const joinedDateLabel = useMemo(() => {
    if (!createdAt) return "N/A"
    return new Date(createdAt).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }, [createdAt])

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!userId) return

    const nextName = usernameInput.trim()
    if (!nextName) {
      setError("Tên hiển thị không được để trống.")
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    const { error: updateError } = await supabase
      .from("profiles")
      .upsert({ id: userId, username: nextName }, { onConflict: "id" })

    if (updateError) {
      setError(updateError.message)
    } else {
      setUsername(nextName)
      setSuccess("Đã cập nhật hồ sơ.")
    }

    setSaving(false)
  }

  const handleLogout = async () => {
    setError(null)
    await supabase.auth.signOut()
    router.replace("/auth/login")
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] pb-[90px]">
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <h1
              className="text-xl font-bold tracking-tight"
              style={{
                fontFamily: "var(--font-display, sans-serif)",
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Hồ sơ của bạn
            </h1>
            <button
              onClick={handleLogout}
              className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition"
            >
              <LogOut className="w-4 h-4" />
              Thoát
            </button>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
            >
              {success}
            </motion.div>
          )}

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={resolveAvatarUrl(avatarUrl)}
                  alt={username}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-200 dark:ring-indigo-800"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
                  style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)" }}
                >
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-800 dark:text-white truncate">{username}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{email || "Không có email"}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Tham gia từ: {joinedDateLabel}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2.5 bg-violet-50 dark:bg-violet-950/40 rounded-xl px-3.5 py-2.5 border border-violet-100 dark:border-violet-900">
              <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="text-sm text-violet-700 dark:text-violet-300 font-medium flex-1">Streak hiện tại</span>
              <span className="text-xs font-bold bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-full">
                {loading ? "..." : `${currentStreak} ngày`}
              </span>
              <span className="text-xs font-bold bg-white/80 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-full border border-violet-200 dark:border-violet-800">
                Dài nhất: {loading ? "..." : `${longestStreak} ngày`}
              </span>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 gap-2"
          >
            <StatCard
              icon={BookOpen}
              value={loading ? "–" : setCount}
              label="Học phần"
              iconClassName="text-indigo-500"
            />
            <StatCard
              icon={Users}
              value={loading ? "–" : groupCount}
              label="Nhóm học"
              iconClassName="text-emerald-500"
            />
            <StatCard
              icon={Flame}
              value={loading ? "–" : currentStreak}
              label="Streak hiện tại"
              iconClassName="text-orange-500"
            />
            <StatCard
              icon={Trophy}
              value={loading ? "–" : longestStreak}
              label="Streak dài nhất"
              iconClassName="text-amber-500"
            />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Chỉnh sửa hồ sơ</p>
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Tên hiển thị"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400"
              />
              <button
                type="submit"
                disabled={saving || loading}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                <Save className="w-4 h-4" />
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </form>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <Link href="/dashboard/sets" className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Quản lý học phần</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link href="/dashboard/groups" className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Quản lý nhóm học</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link href="/dashboard/create" className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-500" />
                Tạo học phần mới
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </motion.section>
        </div>
      </div>

      <BottomNav />
    </>
  )
}
