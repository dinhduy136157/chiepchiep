'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save,
  BookOpen,
  Sparkles,
  GraduationCap,
  Search,
  Bell,
  Settings,
  HelpCircle
} from 'lucide-react'

type CardInput = { term: string; definition: string }

export default function CreateSetPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cards, setCards] = useState<CardInput[]>([{ term: '', definition: '' }])
  const [saving, setSaving] = useState(false)
  const [userName, setUserName] = useState<string>("Duy")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
    }
    getProfile()
  }, [supabase])

  const addRow = () => setCards([...cards, { term: '', definition: '' }])
  const removeRow = (index: number) => {
    if (cards.length === 1) return
    setCards(cards.filter((_, i) => i !== index))
  }

  const filledCards = useMemo(() => {
    return cards.filter((card) => card.term.trim() && card.definition.trim())
  }, [cards])

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tiêu đề học phần.')
      return
    }

    if (filledCards.length === 0) {
      alert('Hãy thêm ít nhất một thẻ trước khi lưu.')
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.')
      setSaving(false)
      return
    }

    const { data: setData, error: setError } = await supabase
      .from('study_sets')
      .insert([{ title, description, author_id: user.id }])
      .select('id')
      .single()

    if (setError || !setData) {
      alert(setError?.message ?? 'Không thể tạo học phần.')
      setSaving(false)
      return
    }

    const cardsToInsert = filledCards.map((card) => ({
      ...card,
      set_id: setData.id,
    }))
    const { error: cardError } = await supabase.from('cards').insert(cardsToInsert)

    if (cardError) {
      alert(cardError.message)
      setSaving(false)
      return
    }

    router.push('/dashboard')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Top Navigation Bar - Giống dashboard */}
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
              <span className="text-sm font-semibold text-slate-600 hidden sm:block">
                Tạo học phần mới
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

      {/* Progress Bar - Thanh tiến độ nhỏ */}
      <div className="h-1 bg-slate-100">
        <motion.div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${(filledCards.length / Math.max(cards.length, 1)) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-indigo-600 font-medium">Tạo học phần</span>
        </div>

        {/* Header với nút back */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                Tạo học phần mới
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Tạo bộ flashcard để bắt đầu học tập hiệu quả
              </p>
            </div>
          </div>

          {/* Nút lưu trên desktop */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="hidden md:flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : 'Lưu học phần'}
          </button>
        </div>

        {/* Main Form */}
        <div className="space-y-8">
          {/* Thông tin cơ bản */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Thông tin cơ bản
            </h2>
            <div className="space-y-4">
              <input
                placeholder="Tiêu đề học phần (VD: IELTS 3000 từ)"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                placeholder="Mô tả ngắn (tuỳ chọn)"
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Danh sách thẻ */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                Danh sách thẻ
                <span className="text-sm font-normal text-slate-400 ml-2">
                  ({filledCards.length} thẻ hợp lệ)
                </span>
              </h2>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Thêm thẻ
              </button>
            </div>

            <div className="space-y-3">
              {cards.map((card, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-200 hover:shadow-md transition-all"
                >
                  <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Thuật ngữ
                      </label>
                      <input
                        placeholder="VD: Apple, Run, Beautiful..."
                        className="w-full border-b border-slate-200 bg-transparent pb-2 text-sm outline-none focus:border-indigo-400 transition-colors"
                        value={card.term}
                        onChange={(e) => {
                          const next = [...cards]
                          next[index].term = e.target.value
                          setCards(next)
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Định nghĩa
                      </label>
                      <input
                        placeholder="VD: Quả táo, Chạy, Đẹp..."
                        className="w-full border-b border-slate-200 bg-transparent pb-2 text-sm outline-none focus:border-indigo-400 transition-colors"
                        value={card.definition}
                        onChange={(e) => {
                          const next = [...cards]
                          next[index].definition = e.target.value
                          setCards(next)
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        disabled={cards.length === 1}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Badge thứ tự */}
                  <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold border-2 border-white">
                    {index + 1}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Nút thêm thẻ ở dưới (mobile) */}
            <button
              type="button"
              onClick={addRow}
              className="mt-4 w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 md:hidden"
            >
              <Plus className="w-4 h-4" />
              Thêm thẻ mới
            </button>
          </div>

          {/* Preview */}
          {filledCards.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-4"
            >
              <div className="flex items-center gap-3 text-sm">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <p className="text-indigo-700">
                  ✨ Sẵn sàng lưu <span className="font-bold">{filledCards.length} thẻ</span> vào học phần
                </p>
              </div>
            </motion.div>
          )}

          {/* Nút lưu cho mobile */}
          <div className="md:hidden">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Đang lưu...' : 'Lưu học phần'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}