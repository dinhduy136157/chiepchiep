"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import { 
  Users, 
  Plus, 
  ChevronRight,
  Crown, 
  User,
  GraduationCap,
  Bell,
  Settings,
  ArrowLeft,
  Check,
  X
} from 'lucide-react'

type Group = {
  id: string
  name: string
  description: string | null
  role?: string | null
}

type Profile = {
  id: string
  username: string | null
}

export default function GroupsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>("Duy")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      if (!cancelled) setCurrentUserId(user.id)

      // Lấy profile user
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserName(profile.username || user.email?.split('@')[0] || "Duy")
        setAvatarUrl(profile.avatar_url)
      } else if (user.email) {
        setUserName(user.email.split('@')[0] || "Duy")
      }

      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .order('username', { ascending: true })

      if (!cancelled) {
        if (profileError) setError(profileError.message)
        setProfiles(profileRows ?? [])
      }

      const { data: membershipRows, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', user.id)

      if (!cancelled && membershipError) {
        setError(membershipError.message)
      }

      const groupIds = (membershipRows ?? []).map((row) => row.group_id)
      if (groupIds.length > 0) {
        const { data: groupRows, error: groupError } = await supabase
          .from('groups')
          .select('id, name, description')
          .in('id', groupIds)

        if (!cancelled) {
          if (groupError) setError(groupError.message)
          const roleById = new Map(
            (membershipRows ?? []).map((row) => [row.group_id, row.role])
          )
          const merged = (groupRows ?? []).map((group) => ({
            ...group,
            role: roleById.get(group.id) ?? null,
          }))
          setGroups(merged)
        }
      } else if (!cancelled) {
        setGroups([])
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [router, supabase])

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Vui lòng nhập tên nhóm.')
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.')
      setSaving(false)
      return
    }

    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert([{ name, description, created_by: user.id }])
      .select('id, name, description')
      .single()

    if (groupError || !groupData) {
      alert(groupError?.message ?? 'Không thể tạo nhóm.')
      setSaving(false)
      return
    }

    const { error: memberError } = await supabase
      .from('group_members')
      .insert([{ group_id: groupData.id, user_id: user.id, role: 'owner' }])

    if (memberError) {
      alert(memberError.message)
      setSaving(false)
      return
    }

    const memberRows = selectedUserIds
      .filter((userId) => userId !== user.id)
      .map((userId) => ({
        group_id: groupData.id,
        user_id: userId,
        role: 'member',
      }))

    if (memberRows.length > 0) {
      const { error: extraMembersError } = await supabase
        .from('group_members')
        .insert(memberRows)

      if (extraMembersError) {
        alert(extraMembersError.message)
      }
    }

    setGroups((prev) => [{ ...groupData, role: 'owner' }, ...prev])
    setName('')
    setDescription('')
    setSelectedUserIds([])
    setSaving(false)
    setShowCreateForm(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Top Navigation Bar - GIỐNG DASHBOARD */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-slate-800 hidden sm:block">FlashLearn</span>
              </Link>
              
              {/* Page Title */}
              <span className="text-sm font-medium text-slate-500 hidden sm:block">
                Quản lý nhóm học tập
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors relative">
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <Settings className="w-5 h-5 text-slate-600" />
              </button>
              
              {/* Avatar */}
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden border border-white/20 shadow-sm">
                <img 
                  src={avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : `${avatarUrl}`) : "/avatars/avatar-anh-meo-cute-5.jpg"} 
                  alt="avatar" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/avatars/avatar-anh-meo-cute-5.jpg"
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-100">
        <motion.div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${(groups.length / 5) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb và nút tạo nhóm */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="text-slate-500 hover:text-indigo-600 transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-indigo-600 font-medium">Nhóm học tập</span>
          </div>

          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-xl transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tạo nhóm mới</span>
            <span className="sm:hidden">Tạo</span>
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Nhóm học tập</h1>
          <p className="text-slate-500">
            Tạo nhóm, chia sẻ học phần và cùng nhau giữ kỷ luật.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            ⚠️ {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.5fr]">
          {/* Form tạo nhóm */}
          {showCreateForm && (
            <motion.section 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-fit"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">Tạo nhóm mới</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  placeholder="Tên nhóm"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <textarea
                  placeholder="Mô tả nhóm (tuỳ chọn)"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-700 mb-2">Chọn thành viên</p>
                <div className="max-h-56 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-3">
                  {profiles.length === 0 ? (
                    <p className="text-xs text-slate-500">Chưa có người dùng.</p>
                  ) : (
                    profiles.map((profile) => {
                      const label = profile.username ?? 'Người dùng chưa đặt tên'
                      const isCurrent = profile.id === currentUserId
                      return (
                        <label
                          key={profile.id}
                          className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {/* Avatar nhỏ cho member */}
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 overflow-hidden">
                              <img 
                                src="/avatars/avatar-anh-meo-cute-5.jpg"
                                alt="avatar"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/avatars/avatar-anh-meo-cute-5.jpg"
                                }}
                              />
                            </div>
                            <div>
                              <p className="font-medium text-slate-700">{label}</p>
                              {isCurrent && (
                                <p className="text-xs text-indigo-600">Bạn</p>
                              )}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(profile.id)}
                            onChange={() => toggleUser(profile.id)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={saving}
                className="mt-6 w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? 'Đang tạo...' : 'Tạo nhóm'}
              </button>
            </motion.section>
          )}

          {/* Danh sách nhóm */}
          <section className={showCreateForm ? "lg:col-span-1" : "lg:col-span-2"}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Nhóm của bạn ({groups.length})
              </h2>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 md:hidden"
                >
                  <Plus className="w-4 h-4" />
                  Tạo nhóm
                </button>
              )}
            </div>

            <div className="space-y-3">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-white rounded-xl border border-slate-200 p-5">
                    <div className="h-5 bg-slate-200 rounded w-1/4 mb-3"></div>
                    <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                  </div>
                ))
              ) : groups.length === 0 ? (
                <div className="bg-white/70 backdrop-blur-sm border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-700 mb-2">Chưa tham gia nhóm nào</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Tạo nhóm mới để bắt đầu học tập cùng bạn bè!
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Tạo nhóm mới
                  </button>
                </div>
              ) : (
                groups.map((group, index) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/dashboard/groups/${group.id}`}>
                      <div className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-md transition-all duration-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            {/* Avatar nhóm */}
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                              {group.role === 'owner' ? (
                                <Crown className="w-5 h-5 text-amber-600" />
                              ) : (
                                <Users className="w-5 h-5 text-indigo-600" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                {group.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  group.role === 'owner' 
                                    ? 'bg-amber-50 text-amber-700' 
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {group.role === 'owner' ? 'Chủ nhóm' : 'Thành viên'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2 pl-13">
                          {group.description || 'Nhóm học tập - Cùng nhau tiến bộ mỗi ngày'}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>

            {/* Nút tạo nhóm ở dưới (desktop) */}
            {!showCreateForm && groups.length > 0 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowCreateForm(true)}
                className="mt-4 w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Tạo nhóm học tập mới
              </motion.button>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}