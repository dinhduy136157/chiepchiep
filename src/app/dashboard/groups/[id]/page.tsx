"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
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
  Sparkles
} from 'lucide-react'

export default function GroupDetailPage() {
  const { id } = useParams()
  const supabase = createClient()
  
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [sharedSets, setSharedSets] = useState<any[]>([])
  const [mySets, setMySets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    const fetchEverything = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: gData } = await supabase.from('groups').select('*').eq('id', id).single()
      const { data: mData } = await supabase.from('group_members').select('user_id, role').eq('group_id', id)
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
      {/* Header với hiệu ứng gradient */}
      <div className="relative overflow-hidden bg-white border-b border-slate-200/80 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 via-transparent to-purple-600/5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <Link 
                href="/dashboard" 
                className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors group mb-4"
              >
                <ChevronRight className="w-4 h-4 rotate-180 mr-1 group-hover:-translate-x-1 transition-transform" />
                Quay lại Dashboard
              </Link>
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                {group?.name}
              </h1>
              <p className="text-slate-500 text-lg mt-2 max-w-2xl">
                {group?.description || "Cùng nhau học tập và tiến bộ mỗi ngày"}
              </p>
              
              {/* Thông tin nhóm */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <Users className="w-4 h-4" />
                  <span>{members.length} thành viên</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <BookOpen className="w-4 h-4" />
                  <span>{sharedSets.length} học phần</span>
                </div>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowShareModal(true)}
              className="group relative px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/25 hover:shadow-xl hover:shadow-indigo-600/30 transition-all duration-200 flex items-center gap-2"
            >
              <Share2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              Chia sẻ học phần
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Học phần của nhóm</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
        </div>
        
        <div className="space-y-8">
          {sharedSets.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/70 backdrop-blur-sm border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center"
            >
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">
                Chưa có học phần nào được chia sẻ trong nhóm
              </p>
              <button
                onClick={() => setShowShareModal(true)}
                className="mt-4 text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                + Chia sẻ học phần đầu tiên
              </button>
            </motion.div>
          ) : (
            sharedSets.map((set, index) => (
              <motion.div
                key={set.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 hover:border-indigo-200/60 hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="p-6 sm:p-8">
                  {/* Header học phần */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-2xl font-bold text-slate-800">{set.title}</h3>
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                      </div>
                      <p className="text-slate-500">{set.description || "Học phần chưa có mô tả"}</p>
                    </div>
                    
                    <Link 
                      href={`/dashboard/set/${set.id}`}
                      className="group/btn inline-flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-600 hover:text-white transition-all duration-200"
                    >
                      <Target className="w-4 h-4" />
                      Học ngay
                      <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>

                  {/* Tiến độ thành viên */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Tiến độ học tập
                      </h4>
                      <span className="text-xs text-slate-400">
                        {set.cards?.length || 0} thẻ nhớ
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                            className="bg-white rounded-xl border border-slate-100 p-4 hover:border-indigo-100 transition-all"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-sm">
                                  {member.role === 'owner' ? (
                                    <Crown className="w-4 h-4 text-yellow-600" />
                                  ) : (
                                    <User className="w-4 h-4 text-indigo-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-700">
                                    {member.user_id.slice(0, 8)}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {member.role === 'owner' ? 'Trưởng nhóm' : 'Thành viên'}
                                  </p>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-indigo-600">{percent}%</span>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percent}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className={`absolute top-0 left-0 h-full rounded-full ${
                                  percent === 100 
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                    : 'bg-gradient-to-r from-indigo-500 to-purple-500'
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
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Chia sẻ học phần</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="p-6 max-h-[400px] overflow-y-auto">
                {mySets.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-400">Bạn chưa có học phần nào</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mySets.map(set => (
                      <motion.div
                        key={set.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleShareSet(set.id)}
                        className="p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition-all group"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">
                              {set.title}
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">
                              {set.description?.slice(0, 50) || "Không có mô tả"}
                            </p>
                          </div>
                          <Plus className="w-5 h-5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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