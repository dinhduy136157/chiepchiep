"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { resolveAvatarUrl } from '@/utils/avatar'
import {
  ArrowLeft,
  Users,
  Plus,
  ChevronRight,
  Crown,
  X,
  Check,
} from 'lucide-react'

// ─── TYPES ───────────────────────────────────────────────
type Group = {
  id: string
  name: string
  description: string | null
  role?: string | null
}

type Profile = {
  id: string
  username: string | null
  avatar_url?: string | null
}

// ─── HELPERS ─────────────────────────────────────────────
const GROUP_GRADIENTS = [
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #6366f1, #4f46e5)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #14b8a6, #0d9488)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
]
const GROUP_EMOJIS = ['🏆', '📖', '⭐', '🎓', '🌈', '🚀']

function getInitials(name: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const AVATAR_COLORS = [
  'linear-gradient(135deg, #6366f1, #a78bfa)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #14b8a6, #0d9488)',
]

// ─── SUB-COMPONENTS ──────────────────────────────────────
function GroupCard({ group, index }: { group: Group; index: number }) {
  const gradient = GROUP_GRADIENTS[index % GROUP_GRADIENTS.length]
  const emoji = GROUP_EMOJIS[index % GROUP_EMOJIS.length]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/dashboard/groups/${group.id}`}>
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all duration-150 hover:border-indigo-200 dark:hover:border-indigo-800 group">
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
            style={{ background: gradient }}
          >
            {emoji}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {group.name}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              {group.description || 'Nhóm học tập · Cùng nhau tiến bộ'}
            </p>
          </div>

          {/* Badge + arrow */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                group.role === 'owner'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {group.role === 'owner' ? '👑 Chủ nhóm' : 'Thành viên'}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function MemberRow({
  profile,
  isCurrentUser,
  selected,
  onToggle,
  colorIndex,
}: {
  profile: Profile
  isCurrentUser: boolean
  selected: boolean
  onToggle: () => void
  colorIndex: number
}) {
  const label = profile.username || 'Người dùng'
  const initials = getInitials(profile.username)
  const color = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
        selected
          ? 'bg-indigo-50 dark:bg-indigo-950/50'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      {/* Avatar */}
      {profile.avatar_url ? (
        <img
          src={resolveAvatarUrl(profile.avatar_url)}
          alt={label}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: color }}
        >
          {initials}
        </div>
      )}

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{label}</p>
        {isCurrentUser && (
          <p className="text-[10px] text-indigo-500 font-semibold">Bạn</p>
        )}
      </div>

      {/* Checkbox */}
      <div
        className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all ${
          selected
            ? 'bg-indigo-500 border-indigo-500'
            : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>
    </button>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────
export default function GroupsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      if (!cancelled) setCurrentUserId(user.id)

      const [
        { data: profileRows, error: profileError },
        { data: membershipRows, error: membershipError },
      ] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url').order('username', { ascending: true }),
        supabase.from('group_members').select('group_id, role').eq('user_id', user.id),
      ])

      if (!cancelled) {
        if (profileError) setError(profileError.message)
        if (membershipError) setError(membershipError.message)
        setProfiles(profileRows ?? [])
      }

      const groupIds = (membershipRows ?? []).map((r) => r.group_id)

      if (groupIds.length > 0) {
        const { data: groupRows, error: groupError } = await supabase
          .from('groups')
          .select('id, name, description')
          .in('id', groupIds)

        if (!cancelled) {
          if (groupError) setError(groupError.message)
          const roleById = new Map((membershipRows ?? []).map((r) => [r.group_id, r.role]))
          setGroups(
            (groupRows ?? []).map((g) => ({ ...g, role: roleById.get(g.id) ?? null }))
          )
        }
      } else if (!cancelled) {
        setGroups([])
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [router, supabase])

  const toggleUser = (userId: string) =>
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )

  const handleCreate = async () => {
    if (!name.trim()) { setFormError('Vui lòng nhập tên nhóm.'); return }
    setFormError(null)
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    // Create group
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert([{ name: name.trim(), description: description.trim(), created_by: user.id }])
      .select('id, name, description')
      .single()

    if (groupError || !groupData) {
      setFormError(groupError?.message ?? 'Không thể tạo nhóm.')
      setSaving(false)
      return
    }

    // Add owner
    await supabase
      .from('group_members')
      .insert([{ group_id: groupData.id, user_id: user.id, role: 'owner' }])

    // Add selected members
    const memberRows = selectedUserIds
      .filter((uid) => uid !== user.id)
      .map((uid) => ({ group_id: groupData.id, user_id: uid, role: 'member' }))

    if (memberRows.length > 0) {
      await supabase.from('group_members').insert(memberRows)
    }

    setGroups((prev) => [{ ...groupData, role: 'owner' }, ...prev])
    setName('')
    setDescription('')
    setSelectedUserIds([])
    setSaving(false)
    setShowCreateForm(false)
  }

  const ownerCount = groups.filter((g) => g.role === 'owner').length

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Sora:wght@700&display=swap');
        body { font-family: 'DM Sans', sans-serif; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] pb-24">

        {/* ── HEADER ── */}
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-3 py-2 rounded-xl flex-shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>

            <h1
              className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate flex-1 text-center"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Nhóm học tập
            </h1>

            <button
              onClick={() => setShowCreateForm(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 active:scale-90 transition-transform"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                boxShadow: '0 3px 10px rgba(79,70,229,.3)',
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">

          {/* ── ERROR ── */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              ⚠️ {error}
            </div>
          )}

          {/* ── META CARD ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800"
          >
            <h2
              className="text-xl font-bold text-slate-800 dark:text-white mb-1"
              style={{ fontFamily: "'Sora', sans-serif", letterSpacing: '-0.4px' }}
            >
              Nhóm học tập 👥
            </h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">
              Tạo nhóm, chia sẻ học phần và cùng nhau tiến bộ mỗi ngày.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { value: groups.length, label: 'Nhóm tham gia' },
                { value: ownerCount, label: 'Chủ nhóm' },
              ].map(({ value, label }) => (
                <div
                  key={label}
                  className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2.5 text-center"
                >
                  <p
                    className="text-2xl font-bold text-indigo-600 dark:text-indigo-400"
                    style={{ fontFamily: "'Sora', sans-serif", letterSpacing: '-1px' }}
                  >
                    {loading ? '–' : value}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mt-0.5">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── CREATE FORM ── */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 p-4">
                  {/* Form header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3
                      className="text-base font-bold text-slate-800 dark:text-white"
                      style={{ fontFamily: "'Sora', sans-serif" }}
                    >
                      Tạo nhóm mới ✨
                    </h3>
                    <button
                      onClick={() => { setShowCreateForm(false); setFormError(null) }}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Fields */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">
                        Tên nhóm *
                      </label>
                      <input
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="VD: IELTS Target 7.0"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition placeholder:font-normal"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">
                        Mô tả (tuỳ chọn)
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Mô tả ngắn về nhóm..."
                        rows={2}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition resize-none"
                      />
                    </div>
                  </div>

                  {/* Member selector */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                        Thêm thành viên
                      </label>
                      {selectedUserIds.length > 0 && (
                        <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                          {selectedUserIds.length} đã chọn
                        </span>
                      )}
                    </div>
                    <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden max-h-44 overflow-y-auto hide-scrollbar">
                      {profiles.length === 0 ? (
                        <p className="text-xs text-slate-400 p-4 text-center">Chưa có người dùng nào.</p>
                      ) : (
                        <div className="p-2 space-y-0.5">
                          {profiles.map((profile, i) => (
                            <MemberRow
                              key={profile.id}
                              profile={profile}
                              isCurrentUser={profile.id === currentUserId}
                              selected={selectedUserIds.includes(profile.id)}
                              onToggle={() => toggleUser(profile.id)}
                              colorIndex={i}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form error */}
                  {formError && (
                    <p className="text-xs text-red-500 mb-3 px-1">{formError}</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowCreateForm(false); setFormError(null) }}
                      className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-500 dark:text-slate-400 active:scale-95 transition-transform"
                    >
                      Huỷ
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={saving || !name.trim()}
                      className="flex-[2] py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 active:scale-95 transition-all"
                      style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 14px rgba(79,70,229,.3)' }}
                    >
                      {saving ? 'Đang tạo...' : `Tạo nhóm ${selectedUserIds.length > 0 ? `(${selectedUserIds.length + 1} người)` : ''}`}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── GROUP LIST ── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-50 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span
                  className="text-sm font-bold text-slate-800 dark:text-white"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Nhóm của bạn
                  <span className="ml-1.5 text-xs font-normal text-slate-400">({groups.length})</span>
                </span>
              </div>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                >
                  <Plus className="w-3.5 h-3.5" /> Tạo mới
                </button>
              )}
            </div>

            <div className="p-3 space-y-2">
              {loading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} />)
              ) : groups.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-7 h-7 text-indigo-300 dark:text-indigo-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Chưa tham gia nhóm nào
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 leading-relaxed">
                    Tạo nhóm mới để học tập cùng<br />bạn bè và theo dõi tiến độ!
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-4 py-2 rounded-xl"
                  >
                    <Plus className="w-4 h-4" /> Tạo nhóm đầu tiên
                  </button>
                </div>
              ) : (
                <>
                  {groups.map((group, i) => (
                    <GroupCard key={group.id} group={group} index={i} />
                  ))}
                  {!showCreateForm && (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2 hover:border-indigo-300 hover:text-indigo-400 transition-all mt-1"
                    >
                      <Plus className="w-4 h-4" /> Tạo nhóm mới hoặc tham gia
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── TIP ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900 px-4 py-3.5"
          >
            <span className="text-xl flex-shrink-0">💡</span>
            <p className="text-sm text-indigo-800 dark:text-indigo-300">
              <span className="font-semibold">Học nhóm hiệu quả hơn 3 lần</span> — chia sẻ học phần và thi đua streak cùng nhau!
            </p>
          </motion.div>

          <div className="h-4" />
        </div>
      </div>
    </>
  )
}
