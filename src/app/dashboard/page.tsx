"use client"
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { sortSetsByRecentView } from '@/utils/recentSets'
import { motion, AnimatePresence } from 'framer-motion'
import AppHeader from '@/components/AppHeader'
import {
  BookOpen,
  Users,
  Plus,
  ChevronRight,
  Crown,
  User,
  Search,
  Home,
  Library,
  UserCircle2,
  Zap,
  Flame,
  GraduationCap,
  X,
} from 'lucide-react'

type StudySet = {
  id: string
  title: string
  description: string | null
  created_at?: string
  card_count?: number
}

type Group = {
  id: string
  name: string
  description: string | null
  role?: string | null
}

type UserStreak = {
  currentStreak: number
  longestStreak: number
  lastActivityDate: string | null
}

const SET_EMOJIS = ['📘', '🧠', '🌏', '🔬', '📖', '🎯', '💡', '🚀', '📝', '🌟']
const GROUP_COLORS = [
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #6366f1, #4f46e5)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #14b8a6, #0d9488)',
]
const GROUP_EMOJIS = ['🏆', '📖', '⭐', '🎓', '🌈']

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

function formatRelativeDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hôm nay'
  if (diffDays === 1) return 'Hôm qua'
  if (diffDays < 7) return `${diffDays} ngày trước`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`
  return date.toLocaleDateString('vi-VN')
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getDayDifference(from: Date, to: Date) {
  const msPerDay = 1000 * 60 * 60 * 24
  const fromDay = startOfLocalDay(from)
  const toDay = startOfLocalDay(to)
  return Math.round((toDay.getTime() - fromDay.getTime()) / msPerDay)
}

// ---------- SUB-COMPONENTS ----------

function SkeletonCard({ height = 72 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
      style={{ height }}
    />
  )
}

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 bg-white dark:bg-slate-900 rounded-2xl">
      <span
        className="font-display text-2xl font-bold tracking-tight text-slate-800 dark:text-white"
        style={{ fontFamily: 'var(--font-display, sans-serif)', letterSpacing: '-1px' }}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
        {label}
      </span>
    </div>
  )
}

function SetCard({ set, index }: { set: StudySet; index: number }) {
  const emoji = SET_EMOJIS[index % SET_EMOJIS.length]
  const bgColors = [
    'bg-indigo-50 dark:bg-indigo-950',
    'bg-purple-50 dark:bg-purple-950',
    'bg-green-50 dark:bg-green-950',
    'bg-orange-50 dark:bg-orange-950',
    'bg-pink-50 dark:bg-pink-950',
  ]
  const bg = bgColors[index % bgColors.length]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/dashboard/set/${set.id}`}>
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 active:scale-[0.98] transition-all duration-150 hover:border-indigo-200 dark:hover:border-indigo-700 group">
          <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center text-xl flex-shrink-0`}>
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {set.title}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {set.description
                ? set.description.length > 40
                  ? set.description.slice(0, 40) + '…'
                  : set.description
                : formatRelativeDate(set.created_at || '')}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </div>
      </Link>
    </motion.div>
  )
}

function GroupCard({ group, index }: { group: Group; index: number }) {
  const emoji = GROUP_EMOJIS[index % GROUP_EMOJIS.length]
  const gradient = GROUP_COLORS[index % GROUP_COLORS.length]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/dashboard/groups/${group.id}`}>
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 active:scale-[0.98] transition-all duration-150 hover:border-emerald-200 dark:hover:border-emerald-700 group">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: gradient }}
          >
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {group.name}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {group.description || 'Nhóm học tập'}
            </p>
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
              group.role === 'owner'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
            }`}
          >
            {group.role === 'owner' ? '👑 Chủ nhóm' : 'Thành viên'}
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

function ContinueCard({ set }: { set: StudySet }) {
  return (
    <Link href={`/dashboard/set/${set.id}`}>
      <div className="mx-0 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
          ⚡
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-white/70 font-medium mb-0.5">Tiếp tục học</p>
          <p className="text-base font-bold text-white truncate"
            style={{ fontFamily: 'var(--font-display, sans-serif)', letterSpacing: '-0.3px' }}>
            {set.title}
          </p>
        </div>
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <ChevronRight className="w-5 h-5 text-white" />
        </div>
      </div>
    </Link>
  )
}

function BottomNav({ active }: { active: 'home' | 'sets' | 'groups' | 'profile' }) {
  const items = [
    { key: 'home', icon: Home, label: 'Trang chủ', href: '/dashboard' },
    { key: 'sets', icon: Library, label: 'Học phần', href: '/dashboard/sets' },
    { key: 'groups', icon: Users, label: 'Nhóm', href: '/dashboard/groups' },
    { key: 'profile', icon: UserCircle2, label: 'Hồ sơ', href: '/dashboard/profile' },
  ] as const

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 pb-safe">
      {items.map((item) => {
        const isActive = item.key === active
        const Icon = item.icon
        return (
          <Link key={item.key} href={item.href} className="flex-1">
            <div className={`flex flex-col items-center gap-1 py-2.5 transition-all duration-150 ${isActive ? '' : 'opacity-50'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/50' : ''}`}>
                <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {item.label}
              </span>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}

// ---------- MAIN PAGE ----------

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studySets, setStudySets] = useState<StudySet[]>([])
  const [allStudySets, setAllStudySets] = useState<StudySet[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [userName, setUserName] = useState<string>('Duy')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [userStreak, setUserStreak] = useState<UserStreak>({
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const now = new Date()
      const nowIso = now.toISOString()
      const { data: streakRow, error: streakError } = await supabase
        .from('UserStreaks')
        .select('CurrentStreak, LongestStreak, LastActivityDate')
        .eq('UserId', user.id)
        .maybeSingle()

      if (!cancelled && streakError) {
        setError(streakError.message)
      }

      if (!streakError) {
        if (!streakRow) {
          const initialStreak: UserStreak = {
            currentStreak: 1,
            longestStreak: 1,
            lastActivityDate: nowIso,
          }
          const { error: insertStreakError } = await supabase
            .from('UserStreaks')
            .insert({
              UserId: user.id,
              CurrentStreak: initialStreak.currentStreak,
              LongestStreak: initialStreak.longestStreak,
              LastActivityDate: initialStreak.lastActivityDate,
              UpdatedAt: nowIso,
            })

          if (!cancelled) {
            if (insertStreakError) {
              setError(insertStreakError.message)
            } else {
              setUserStreak(initialStreak)
            }
          }
        } else {
          let nextCurrent = streakRow.CurrentStreak ?? 0
          let nextLongest = streakRow.LongestStreak ?? 0
          const lastActivityDate = streakRow.LastActivityDate as string | null
          const lastActivity = lastActivityDate ? new Date(lastActivityDate) : null
          const dayDiff = lastActivity ? getDayDifference(lastActivity, now) : 999
          let shouldUpdate = false

          if (!lastActivity || dayDiff > 1) {
            nextCurrent = 1
            shouldUpdate = true
          } else if (dayDiff === 1) {
            nextCurrent = (streakRow.CurrentStreak ?? 0) + 1
            shouldUpdate = true
          }

          nextLongest = Math.max(nextLongest, nextCurrent)

          if (shouldUpdate) {
            const { error: updateStreakError } = await supabase
              .from('UserStreaks')
              .update({
                CurrentStreak: nextCurrent,
                LongestStreak: nextLongest,
                LastActivityDate: nowIso,
                UpdatedAt: nowIso,
              })
              .eq('UserId', user.id)

            if (!cancelled && updateStreakError) {
              setError(updateStreakError.message)
            }
          }

          if (!cancelled) {
            setUserStreak({
              currentStreak: nextCurrent,
              longestStreak: nextLongest,
              lastActivityDate: shouldUpdate ? nowIso : lastActivityDate,
            })
          }
        }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single()

      if (!cancelled && profile) {
        setUserName(profile.username || user.email?.split('@')[0] || 'Duy')
        setAvatarUrl(profile.avatar_url)
      } else if (user.email) {
        setUserName(user.email.split('@')[0] || 'Duy')
      }

      const { data: allSetsRows, error: allSetsError } = await supabase
        .from('study_sets')
        .select('id, title, description, created_at')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      if (!cancelled) {
        if (allSetsError) setError(allSetsError.message)
        const allSets = allSetsRows ?? []
        const sortedSets = sortSetsByRecentView(allSets)
        setAllStudySets(allSets)
        setStudySets(sortedSets.slice(0, 5))
      }

      const { data: membershipRows, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', user.id)

      if (!cancelled && membershipError) setError(membershipError.message)

      const groupIds = (membershipRows ?? []).map((row) => row.group_id)

      if (groupIds.length > 0) {
        const { data: groupRows, error: groupError } = await supabase
          .from('groups')
          .select('id, name, description')
          .in('id', groupIds)

        if (!cancelled) {
          if (groupError) setError(groupError.message)
          const roleById = new Map((membershipRows ?? []).map((row) => [row.group_id, row.role]))
          const merged = (groupRows ?? []).map((group) => ({
            ...group,
            role: roleById.get(group.id) ?? null,
          }))
          setGroups(merged)
        }
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [router, supabase])

  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return []
    return allStudySets.filter(
      (s) => s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
    )
  }, [allStudySets, searchTerm])

  const firstName = userName.split(' ')[0]
  const initials = userName.slice(0, 2).toUpperCase()

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] pb-[90px]">

        {/* ── STICKY HEADER ── */}
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
          <div className="max-w-lg mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              {/* Brand */}
              <span
                className="text-xl font-bold tracking-tight"
                style={{
                  fontFamily: 'var(--font-display, sans-serif)',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Chiepchiep
              </span>

              <div className="flex items-center gap-2">
                {/* Search toggle */}
                <button
                  onClick={() => setSearchOpen((v) => !v)}
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition active:scale-90"
                >
                  {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                </button>

                {/* Avatar */}
                {avatarUrl ? (
                  <Link href="/dashboard/profile">
                    <img src={avatarUrl} alt={userName} className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-200 dark:ring-indigo-800" />
                  </Link>
                ) : (
                  <Link href="/dashboard/profile">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}>
                      {initials}
                    </div>
                  </Link>
                )}
              </div>
            </div>

            {/* Search bar slide */}
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden pb-3"
                >
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5">
                    <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Tìm học phần..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200 w-full placeholder:text-slate-400"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 space-y-3 pt-4">

          {/* ── ERROR ── */}
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              ⚠️ {error}
            </motion.div>
          )}

          {/* ── SEARCH RESULTS ── */}
          <AnimatePresence>
            {searchTerm.trim() && searchOpen && (
              <motion.section
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800"
              >
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Search className="w-4 h-4 text-indigo-500" />
                    {searchResults.length} kết quả
                  </span>
                  <button onClick={() => { setSearchTerm(''); setSearchOpen(false) }}
                    className="text-xs text-slate-400 hover:text-slate-600">
                    Đóng
                  </button>
                </div>
                {searchResults.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">Không tìm thấy học phần phù hợp.</div>
                ) : (
                  <div className="p-3 space-y-2">
                    {searchResults.map((set, i) => <SetCard key={set.id} set={set} index={i} />)}
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* ── HERO GREETING ── */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight"
                  style={{ fontFamily: 'var(--font-display, sans-serif)', letterSpacing: '-0.5px' }}>
                  {getGreeting()},<br />{firstName}! ✨
                </h1>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Hôm nay ôn được chưa?</p>
              </div>
              <Link
                href="/dashboard/create"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold flex-shrink-0 active:scale-95 transition-transform shadow-md"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 12px rgba(79,70,229,0.35)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Tạo mới
              </Link>
            </div>

            {/* Streak row */}
            <div className="mt-4 flex items-center gap-2.5 bg-violet-50 dark:bg-violet-950/40 rounded-xl px-3.5 py-2.5 border border-violet-100 dark:border-violet-900">
              <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="text-sm text-violet-700 dark:text-violet-300 font-medium flex-1">Streak hiện tại của bạn</span>
              <span className="text-xs font-bold bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-full">
                {loading ? '...' : `${userStreak.currentStreak} ngày 🔥`}
              </span>
            </div>
          </motion.div>

          {/* ── STATS ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-3 gap-1"
          >
            <StatCard value={loading ? '–' : allStudySets.length} label="Học phần" />
            <StatCard value={loading ? '–' : groups.length} label="Nhóm học" />
            <StatCard value={loading ? '–' : userStreak.longestStreak} label="Streak dài nhất" />
          </motion.div>

          {/* ── CONTINUE STUDYING (nếu có set) ── */}
          {!loading && studySets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <ContinueCard set={studySets[0]} />
            </motion.div>
          )}

          {/* ── STUDY SETS ── */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-base font-bold text-slate-800 dark:text-white"
                  style={{ fontFamily: 'var(--font-display, sans-serif)', letterSpacing: '-0.3px' }}>
                  Học phần gần đây
                </span>
              </div>
              <Link href="/dashboard/sets"
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1.5 rounded-lg">
                Tất cả <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="p-3 space-y-2">
              {loading ? (
                [...Array(4)].map((_, i) => <SkeletonCard key={i} height={64} />)
              ) : studySets.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-7 h-7 text-indigo-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">Chưa có học phần nào</p>
                  <p className="text-xs text-slate-400 mb-4">Tạo học phần đầu tiên để bắt đầu!</p>
                  <Link href="/dashboard/create"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-400 px-4 py-2 rounded-xl">
                    <Plus className="w-4 h-4" /> Tạo học phần mới
                  </Link>
                </div>
              ) : (
                studySets.map((set, i) => <SetCard key={set.id} set={set} index={i} />)
              )}
            </div>
          </motion.section>

          {/* ── GROUPS ── */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-base font-bold text-slate-800 dark:text-white"
                  style={{ fontFamily: 'var(--font-display, sans-serif)', letterSpacing: '-0.3px' }}>
                  Nhóm học tập
                </span>
              </div>
              <Link href="/dashboard/groups"
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1.5 rounded-lg">
                Quản lý <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="p-3 space-y-2">
              {loading ? (
                [...Array(3)].map((_, i) => <SkeletonCard key={i} height={64} />)
              ) : groups.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-7 h-7 text-emerald-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">Chưa tham gia nhóm nào</p>
                  <p className="text-xs text-slate-400 mb-4">Học cùng bạn bè sẽ vui và hiệu quả hơn!</p>
                  <Link href="/dashboard/groups"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-4 py-2 rounded-xl">
                    <Plus className="w-4 h-4" /> Tạo nhóm mới
                  </Link>
                </div>
              ) : (
                <>
                  {groups.map((g, i) => <GroupCard key={g.id} group={g} index={i} />)}
                  <Link href="/dashboard/groups">
                    <div className="flex items-center justify-center py-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-400 dark:text-slate-500 font-medium gap-1.5 mt-1 hover:border-emerald-300 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Tạo nhóm mới
                    </div>
                  </Link>
                </>
              )}
            </div>
          </motion.section>

          {/* ── TIP ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 rounded-2xl border border-green-100 dark:border-green-900 px-4 py-3.5"
          >
            <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              <span className="font-semibold">Ôn 10–15 phút mỗi ngày</span> hiệu quả hơn học dồn nhiều lần. Giữ streak nhé! 💪
            </p>
          </motion.div>

          {/* bottom spacing */}
          <div className="h-2" />
        </div>
      </div>

      {/* ── BOTTOM NAV ── */}
      <BottomNav active="home" />
    </>
  )
}

