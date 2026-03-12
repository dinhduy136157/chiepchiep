"use client"
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import { 
  BookOpen, 
  Users, 
  LogOut, 
  Plus, 
  ChevronRight,
  Sparkles,
  Clock,
  Crown,
  User,
  Library,
  GraduationCap,
  Search,
  Bell,
  Settings
} from 'lucide-react'

type StudySet = {
  id: string
  title: string
  description: string | null
  created_at?: string
}

type Group = {
  id: string
  name: string
  description: string | null
  role?: string | null
}

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studySets, setStudySets] = useState<StudySet[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [userName, setUserName] = useState<string>("Duy")
  const [searchTerm, setSearchTerm] = useState("")

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

      // Lấy thông tin user
      if (user.email) {
        setUserName(user.email.split('@')[0] || "Duy")
      }

      // 1. Fetch Study Sets
      const { data: setRows, error: setLoadError } = await supabase
        .from('study_sets')
        .select('id, title, description, created_at')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (!cancelled && setLoadError) setError(setLoadError.message)

      // 2. Fetch Groups
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

      if (!cancelled) {
        setStudySets(setRows ?? [])
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [router, supabase])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  // Filter study sets based on search
  const filteredStudySets = studySets.filter(set =>
    set.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    set.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Top Navigation Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-slate-800">FlashLearn</span>
              </Link>
              
              {/* Search Bar */}
              <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 w-64">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm học phần..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-slate-600 w-full placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors relative">
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <Settings className="w-5 h-5 text-slate-600" />
              </button>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-slate-800">
                Xin chào, {userName}!
              </h1>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Sparkles className="w-6 h-6 text-yellow-500" />
              </motion.div>
            </div>
            <p className="text-slate-500">
              Hôm nay bạn muốn học gì?
            </p>
          </div>

          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link 
                href="/dashboard/create" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-xl hover:shadow-indigo-600/30 transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Tạo học phần
              </Link>
            </motion.div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={logout}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </motion.button>
          </div>
        </motion.div>

        {/* Mobile Search (hiển thị trên mobile) */}
        <div className="md:hidden mb-6">
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm học phần..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-600 w-full placeholder:text-slate-400"
            />
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            ⚠️ {error}
          </motion.div>
        )}

        {/* Main Content - Focus on Study Sets and Groups */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Study Sets Section - Nổi bật hơn */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-1"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Library className="w-6 h-6 text-indigo-600" />
                Học phần gần đây
                {filteredStudySets.length > 0 && (
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    ({filteredStudySets.length})
                  </span>
                )}
              </h2>
              <Link 
                href="/dashboard/sets" 
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 group"
              >
                Xem tất cả
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="space-y-3">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                      <div className="h-5 bg-slate-200 rounded w-1/3 mb-3"></div>
                      <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                    </div>
                  </div>
                ))
              ) : filteredStudySets.length === 0 ? (
                <motion.div 
                  variants={itemVariants}
                  className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center"
                >
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="font-semibold text-slate-700 mb-2">Chưa có học phần nào</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Bắt đầu tạo học phần đầu tiên để học tập hiệu quả hơn!
                  </p>
                  <Link 
                    href="/dashboard/create"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 font-medium rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Tạo học phần mới
                  </Link>
                </motion.div>
              ) : (
                filteredStudySets.map((set, index) => (
                  <motion.div
                    key={set.id}
                    variants={itemVariants}
                    custom={index}
                  >
                    <Link href={`/dashboard/set/${set.id}`}>
                      <div className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-lg transition-all duration-200">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors text-lg">
                            {set.title}
                          </h3>
                          <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                            <Clock className="w-3 h-3" />
                            {new Date(set.created_at || '').toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {set.description || 'Chưa có mô tả cho học phần này'}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs font-medium text-indigo-600 group-hover:translate-x-1 transition-transform">
            Bắt đầu học →
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </motion.section>

          {/* Groups Section */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-emerald-600" />
                Nhóm học tập
                {groups.length > 0 && (
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    ({groups.length})
                  </span>
                )}
              </h2>
              <Link 
                href="/dashboard/groups" 
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 group"
              >
                Quản lý nhóm
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="space-y-3">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                      <div className="h-5 bg-slate-200 rounded w-1/4 mb-3"></div>
                      <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                    </div>
                  </div>
                ))
              ) : groups.length === 0 ? (
                <motion.div 
                  variants={itemVariants}
                  className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center"
                >
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-slate-700 mb-2">Chưa tham gia nhóm nào</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Tham gia nhóm để học tập cùng bạn bè và theo dõi tiến độ!
                  </p>
                  <Link 
                    href="/dashboard/groups/create"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 font-medium rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Tạo nhóm mới
                  </Link>
                </motion.div>
              ) : (
                groups.map((group, index) => (
                  <motion.div
                    key={group.id}
                    variants={itemVariants}
                    custom={index}
                  >
                    <Link href={`/dashboard/groups/${group.id}`}>
                      <div className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-200 hover:shadow-lg transition-all duration-200">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                              {group.role === 'owner' ? (
                                <Crown className="w-5 h-5 text-amber-600" />
                              ) : (
                                <User className="w-5 h-5 text-emerald-600" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">
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
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  2 thành viên
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2 pl-12">
                          {group.description || 'Nhóm học tập - Cùng nhau tiến bộ mỗi ngày'}
                        </p>
                        <div className="mt-3 pl-12">
                          <span className="text-xs font-medium text-emerald-600 group-hover:translate-x-1 transition-transform inline-block">
                            Vào phòng học →
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>

            {/* Quick Action để tạo nhóm mới */}
            {groups.length > 0 && (
              <motion.div
                variants={itemVariants}
                className="mt-4"
              >
                <Link 
                  href="/dashboard/groups/create"
                  className="block w-full p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors text-center text-sm text-slate-600 font-medium"
                >
                  + Tạo nhóm học tập mới
                </Link>
              </motion.div>
            )}
          </motion.section>
        </div>

        {/* Recent Activity - Nhẹ nhàng ở cuối trang */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-4">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <p>✨ <span className="font-medium">Mẹo nhỏ:</span> Học 15 phút mỗi ngày sẽ hiệu quả hơn học 2 tiếng một lần!</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}