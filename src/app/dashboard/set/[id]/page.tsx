"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  Check, 
  X,
  BookOpen,
  Layers,
  Clock,
  Award,
  Sparkles,
  ArrowLeft,
  Grid3x3,
  List,
  Eye,
  EyeOff,
  Plus
} from 'lucide-react'

export default function SetDetailPage() {
  const { id } = useParams()
  const supabase = createClient()
  
  const [cards, setCards] = useState<any[]>([])
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set())
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [viewMode, setViewMode] = useState<'flashcard' | 'list'>('flashcard')
  const [showDefinition, setShowDefinition] = useState(false)
  const [studyStats, setStudyStats] = useState({
    studied: 0,
    remaining: 0,
    mastered: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Lấy thông tin bộ thẻ
      const { data: setData } = await supabase
        .from('study_sets')
        .select('title, description')
        .eq('id', id)
        .single()
      
      if (setData) {
        setTitle(setData.title)
        setDescription(setData.description || '')
      }

      // 2. Lấy danh sách cards
      const { data: cardsData } = await supabase
        .from('cards')
        .select('*')
        .eq('set_id', id)
        .order('id', { ascending: true })
      
      // 3. Lấy tiến độ học tập của User hiện tại
      const { data: progressData } = await supabase
        .from('learning_progress')
        .select('card_id')
        .eq('user_id', user.id)
        .eq('status', 'mastered')

      if (cardsData) setCards(cardsData)
      if (progressData) {
        setMasteredIds(new Set(progressData.map(p => p.card_id)))
      }
      setLoading(false)
    }
    fetchData()
  }, [id, supabase])

  useEffect(() => {
    if (cards.length > 0) {
      setStudyStats({
        studied: masteredIds.size,
        remaining: cards.length - masteredIds.size,
        mastered: Math.round((masteredIds.size / cards.length) * 100)
      })
    }
  }, [masteredIds, cards])

  const toggleMastered = async (cardId: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const isAlreadyMastered = masteredIds.has(cardId)
    
    const { error } = await supabase
      .from('learning_progress')
      .upsert({ 
        user_id: user.id, 
        card_id: cardId, 
        status: isAlreadyMastered ? 'learning' : 'mastered',
        last_reviewed: new Date().toISOString()
      }, { onConflict: 'user_id, card_id' })

    if (!error) {
      const newMastered = new Set(masteredIds)
      if (isAlreadyMastered) newMastered.delete(cardId)
      else newMastered.add(cardId)
      setMasteredIds(newMastered)
    }
  }

  const nextCard = () => { 
    setIsFlipped(false); 
    setCurrentIndex((prev) => (prev + 1) % cards.length) 
  }
  
  const prevCard = () => { 
    setIsFlipped(false); 
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length) 
  }

  const shuffleCards = () => {
    const randomIndex = Math.floor(Math.random() * cards.length)
    setCurrentIndex(randomIndex)
    setIsFlipped(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-indigo-600 font-semibold">Đang tải học phần...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header với gradient */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-800">{title}</h1>
                <p className="text-sm text-slate-500">{description || "Học phần flashcard"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('flashcard')}
                className={`p-2 rounded-xl transition-colors ${
                  viewMode === 'flashcard' 
                    ? 'bg-indigo-100 text-indigo-600' 
                    : 'text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-indigo-100 text-indigo-600' 
                    : 'text-slate-400 hover:bg-slate-100'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-100">
        <motion.div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${studyStats.mastered}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-xs text-slate-400">Tổng số</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{cards.length}</p>
            <p className="text-xs text-slate-500">thẻ nhớ</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs text-slate-400">Đã thuộc</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{studyStats.studied}</p>
            <p className="text-xs text-slate-500">thẻ</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-xs text-slate-400">Còn lại</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{studyStats.remaining}</p>
            <p className="text-xs text-slate-500">cần ôn</p>
          </div>
        </div>

        {/* Flashcard Mode */}
        {viewMode === 'flashcard' && cards.length > 0 && (
          <div className="mb-12">
            {/* Card Counter */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">
                  Thẻ {currentIndex + 1} / {cards.length}
                </span>
                <div className="flex items-center gap-1">
                  {cards.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentIndex 
                          ? 'bg-indigo-600' 
                          : idx < currentIndex 
                            ? 'bg-indigo-200' 
                            : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <button
                onClick={shuffleCards}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <RotateCw className="w-4 h-4" />
                Xáo trộn
              </button>
            </div>

            {/* Flashcard */}
            <motion.div 
              className="relative cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isFlipped ? 'back' : 'front'}
                  initial={{ rotateY: isFlipped ? -180 : 0, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: isFlipped ? 0 : 180, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-12 md:p-16 min-h-[400px] flex items-center justify-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  {!isFlipped ? (
                    <div className="text-center">
                      <span className="text-5xl md:text-6xl font-bold text-slate-800">
                        {cards[currentIndex].term}
                      </span>
                      <p className="text-sm text-slate-400 mt-4">Nhấn vào thẻ để lật</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="text-2xl md:text-3xl text-slate-600 leading-relaxed">
                        {cards[currentIndex].definition}
                      </span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Progress trên card */}
              {masteredIds.has(cards[currentIndex].id) && (
                <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Đã thuộc
                </div>
              )}
            </motion.div>

            {/* Controls */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={prevCard}
                className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-indigo-200 hover:bg-indigo-50 transition-all"
              >
                <ChevronLeft className="w-6 h-6 text-slate-600" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); toggleMastered(cards[currentIndex].id) }}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  masteredIds.has(cards[currentIndex].id)
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                    : 'bg-white border-2 border-slate-200 text-slate-400 hover:border-emerald-500 hover:text-emerald-500'
                }`}
              >
                <Check className="w-8 h-8" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={nextCard}
                className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-indigo-200 hover:bg-indigo-50 transition-all"
              >
                <ChevronRight className="w-6 h-6 text-slate-600" />
              </motion.button>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 flex justify-center gap-4 text-sm">
              <span className="text-slate-500">
                Đã học: <span className="font-bold text-indigo-600">{studyStats.studied}</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">
                Tiến độ: <span className="font-bold text-emerald-600">{studyStats.mastered}%</span>
              </span>
            </div>
          </div>
        )}

        {/* List Mode */}
        {viewMode === 'list' && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Danh sách thẻ nhớ
              </h2>
              <div className="text-sm text-slate-500">
                {masteredIds.size}/{cards.length} đã thuộc
              </div>
            </div>
            
            <div className="space-y-3">
              {cards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`group bg-white rounded-xl border ${
                    masteredIds.has(card.id) 
                      ? 'border-emerald-200 bg-emerald-50/30' 
                      : 'border-slate-200 hover:border-indigo-200'
                  } p-4 transition-all`}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleMastered(card.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        masteredIds.has(card.id)
                          ? 'bg-emerald-500 text-white'
                          : 'border-2 border-slate-300 text-transparent hover:border-emerald-500'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    
                    <div className="flex-1 grid md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-slate-400 mb-1 block">Thuật ngữ</span>
                        <p className="font-semibold text-slate-800">{card.term}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 mb-1 block">Định nghĩa</span>
                        <p className="text-slate-600">{card.definition}</p>
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <button
                      onClick={() => {
                        setViewMode('flashcard')
                        setCurrentIndex(index)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-indigo-50 rounded-lg"
                    >
                      <Eye className="w-4 h-4 text-indigo-600" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {cards.length === 0 && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Chưa có thẻ nhớ nào</h3>
            <p className="text-slate-400 mb-4">Học phần này chưa có thẻ flashcard</p>
            <Link
              href={`/dashboard/set/${id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm thẻ mới
            </Link>
          </div>
        )}
      </main>

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  )
}