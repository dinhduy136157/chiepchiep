"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import AppHeader from '@/components/AppHeader'
import { resolveAvatarUrl } from '@/utils/avatar'
import { 
  BookOpen, 
  Users, 
  ChevronRight, 
  X, 
  Crown, 
  User, 
  Plus,
  Share2,
  TrendingUp,
  Target,
  Sparkles,
  ArrowLeft
} from 'lucide-react'

export default function GroupDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [sharedSets, setSharedSets] = useState<any[]>([])
  const [mySets, setMySets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)
  const [userName, setUserName] = useState<string>("Duy")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchEverything = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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

      const { data: gData } = await supabase.from('groups').select('*').eq('id', id).single()
      const { data: mData } = await supabase
        .from('group_members')
        .select(`
          user_id, 
          role,
          profiles:user_id ( username, avatar_url ) 
        `)
        .eq('group_id', id)
      const { data: msData } = await supabase.from('study_sets').select('*').eq('author_id', user.id)
      
      const { data: ssData } = await supabase
        .from('group_study_sets')
        .select(`
          study_sets (
            id, title, description,
            cards ( 
              id, 
              learning_progress ( user_id, status )
            )
          )
        `)
        .eq('group_id', id)

      setGroup(gData)
      setMembers(mData || [])
      setMySets(msData || [])
      setSharedSets(ssData?.map(item => item.study_sets) || [])
      setLoading(false)
    }
    fetchEverything()
  }, [id, supabase])

  const handleShareSet = async (setId: string) => {
    const { error } = await supabase.from('group_study_sets').insert([{ group_id: id, set_id: setId }])
    if (error) alert("Học phần này đã có trong nhóm!")
    else {
      setShowShareModal(false)
      window.location.reload()
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-indigo-600 font-semibold">Đang tải dữ liệu...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <AppHeader pageTitle={group?.name} avatarUrl={avatarUrl} userName={userName} />
      </motion.div>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-100">
        <motion.div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${(sharedSets.length / 5) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb và nút chia sẻ */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="text-slate-500 hover:text-indigo-600 transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <Link href="/dashboard/groups" className="text-slate-500 hover:text-indigo-600 transition-colors">
              Nhóm
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-indigo-600 font-medium">{group?.name}</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowShareModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-xl transition-all duration-200 flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Chia sẻ học phần</span>
            <span className="sm:hidden">Chia sẻ</span>
          </motion.button>
        </div>

        {/* Group Info - ĐƠN GIẢN HƠN */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{group?.name}</h1>
          <p className="text-slate-500 mb-4">{group?.description || "Cùng nhau học tập và tiến bộ mỗi ngày"}</p>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Users className="w-4 h-4" />
              <span>{members.length} thành viên</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <BookOpen className="w-4 h-4" />
              <span>{sharedSets.length} học phần</span>
            </div>
          </div>
        </div>

        {/* Học phần của nhóm */}
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-bold text-slate-800">Học phần của nhóm</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
        </div>
        
        <div className="space-y-6">
          {sharedSets.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/70 backdrop-blur-sm border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center"
            >
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium mb-3">
                Chưa có học phần nào được chia sẻ
              </p>
              <button
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                <Share2 className="w-4 h-4" />
                Chia sẻ ngay
              </button>
            </motion.div>
          ) : (
            sharedSets.map((set, index) => (
              <motion.div
                key={set.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="p-5">
                  {/* Header học phần */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-800">{set.title}</h3>
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{set.description || "Học phần chưa có mô tả"}</p>
                    </div>
                    
                    <Link 
                      href={`/dashboard/set/${set.id}`}
                      className="group/btn inline-flex items-center gap-1 px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-600 hover:text-white transition-all duration-200"
                    >
                      <Target className="w-3 h-3" />
                      Học ngay
                      <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>

                  {/* Tiến độ thành viên */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Tiến độ học tập
                      </h4>
                      <span className="text-xs text-slate-400">
                        {set.cards?.length || 0} thẻ
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {members.map((member) => {
                        const totalCards = set.cards?.length || 0;
                        const masteredCount = set.cards?.filter((card: any) => 
                          card.learning_progress?.some((lp: any) => 
                            lp.user_id === member.user_id && lp.status === 'mastered'
                          )
                        ).length || 0;
                        
                        const percent = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

                        return (
                          <div 
                            key={member.user_id}
                            className="bg-slate-50 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {/* Avatar của member - DÙNG ĐƯỜNG DẪN Y HỆT */}
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 overflow-hidden">
                                  <img 
                                    src={resolveAvatarUrl(member.profiles?.avatar_url)}
                                    alt="avatar"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/avatars/avatar-anh-meo-cute-5.jpg"
                                    }}
                                  />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-slate-700">
                                    {member.profiles?.username || member.user_id.slice(0, 6)}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-indigo-600">{percent}%</span>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percent}%` }}
                                transition={{ duration: 1 }}
                                className={`h-full rounded-full ${
                                  percent === 100 ? 'bg-green-500' : 'bg-indigo-500'
                                }`}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Modal chia sẻ */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Chia sẻ học phần</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              
              <div className="p-5 max-h-[400px] overflow-y-auto">
                {mySets.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Bạn chưa có học phần nào</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mySets.map(set => (
                      <motion.div
                        key={set.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleShareSet(set.id)}
                        className="p-3 rounded-lg border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition-all group"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-slate-700 group-hover:text-indigo-700 text-sm">
                              {set.title}
                            </h4>
                          </div>
                          <Plus className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}




