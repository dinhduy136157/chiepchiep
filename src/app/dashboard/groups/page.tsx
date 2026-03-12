"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

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

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

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
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700/70">
              Nhóm học
            </p>
            <h1 className="text-3xl font-semibold">Xây dựng đội học của bạn</h1>
            <p className="mt-2 text-sm text-slate-600">
              Tạo nhóm, chia sẻ học phần và cùng nhau giữ kỷ luật.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            Về bảng điều khiển
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1.5fr]">
          <section className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur">
            <h2 className="text-lg font-semibold">Tạo nhóm mới</h2>
            <p className="mt-2 text-sm text-slate-600">
              Mời bạn bè sau khi bạn tạo xong không gian.
            </p>
            <div className="mt-6 space-y-4">
              <input
                placeholder="Tên nhóm"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <textarea
                placeholder="Mô tả nhóm"
                className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-800">Chọn thành viên</p>
              <p className="mt-1 text-xs text-slate-500">
                Danh sách người dùng hiện có trong hệ thống.
              </p>
              <div className="mt-4 max-h-56 space-y-2 overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
                {profiles.length === 0 ? (
                  <p className="text-xs text-slate-500">Chưa có người dùng.</p>
                ) : (
                  profiles.map((profile) => {
                    const label = profile.username ?? 'Người dùng chưa đặt tên'
                    const isCurrent = profile.id === currentUserId
                    return (
                      <label
                        key={profile.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-700"
                      >
                        <div>
                          <p className="font-medium">{label}</p>
                          {isCurrent ? (
                            <p className="text-xs text-emerald-600">Bạn</p>
                          ) : null}
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(profile.id)}
                          onChange={() => toggleUser(profile.id)}
                          className="h-4 w-4 accent-emerald-600"
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
              className="mt-6 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {saving ? 'Đang tạo...' : 'Tạo nhóm'}
            </button>
          </section>

          <section className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur">
            <h2 className="text-lg font-semibold">Nhóm của bạn</h2>
            <div className="mt-6 grid gap-4">
              {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Đang tải nhóm...
                </div>
              ) : groups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Bạn chưa tham gia nhóm nào.
                </div>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">{group.name}</p>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {group.role === 'owner' ? 'chủ nhóm' : group.role ?? 'thành viên'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {group.description ?? 'Chưa có mô tả.'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
