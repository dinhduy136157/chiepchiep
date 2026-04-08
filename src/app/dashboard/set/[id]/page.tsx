"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { markSetViewed } from '@/utils/recentSets'
import Link from 'next/link'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import {
  ArrowLeft, Plus, Send, X, Check, RotateCw,
  BookOpen, Brain, FileText, LayoutGrid, Crown,
  FileDown, ChevronLeft, ChevronRight,
} from 'lucide-react'

// ─── TYPES ───────────────────────────────────────────────
type Card = {
  id: number
  term: string
  definition: string
  set_id: string
}

type Mode = 'flashcards' | 'flashcards-full' | 'learn' | 'test' | 'match'

// ─── SWIPEABLE FLASHCARD ─────────────────────────────────
function SwipeableCard({
  card,
  isFlipped,
  setIsFlipped,
  onSwipe,
}: {
  card: Card
  isFlipped: boolean
  setIsFlipped: (v: boolean) => void
  onSwipe: (dir: 1 | -1) => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-160, 160], [-18, 18])
  const opacity = useTransform(x, [-260, -120, 0, 120, 260], [0, 1, 1, 1, 0])
  const wrongOpacity = useTransform(x, [-90, -30], [1, 0])
  const rightOpacity = useTransform(x, [30, 90], [0, 1])

  return (
    <motion.div
      style={{ x, rotate, opacity, touchAction: 'none' }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.65}
      onDragEnd={(_, info) => {
        if (info.offset.x > 55 || info.velocity.x > 380) onSwipe(1)
        else if (info.offset.x < -55 || info.velocity.x < -380) onSwipe(-1)
      }}
      onClick={() => { if (Math.abs(x.get()) < 5) setIsFlipped(!isFlipped) }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      {/* Học lại label */}
      <motion.div
        style={{ opacity: wrongOpacity }}
        className="absolute top-5 right-5 z-50 pointer-events-none"
      >
        <span className="inline-block border-2 border-red-500 text-red-500 font-bold text-sm px-3 py-1 rounded-lg rotate-12 bg-white/95">
          HỌC LẠI
        </span>
      </motion.div>

      {/* Đã biết label */}
      <motion.div
        style={{ opacity: rightOpacity }}
        className="absolute top-5 left-5 z-50 pointer-events-none"
      >
        <span className="inline-block border-2 border-emerald-500 text-emerald-600 font-bold text-sm px-3 py-1 rounded-lg -rotate-12 bg-white/95">
          ĐÃ BIẾT
        </span>
      </motion.div>

      {/* Card flip container */}
      <div className="w-full h-full" style={{ perspective: '1000px' }}>
        <motion.div
          className="w-full h-full relative"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 28, duration: 0.5 }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-[22px] bg-white border border-slate-100 flex flex-col items-center justify-center p-7 text-center shadow-lg"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="absolute top-4 left-5 text-[9px] font-bold uppercase tracking-widest text-slate-300">
              Thuật ngữ
            </span>
            <p className="text-3xl font-bold text-slate-800 leading-tight" style={{ fontFamily: "'Sora', sans-serif", letterSpacing: '-0.5px' }}>
              {card.term}
            </p>
            <p className="text-xs text-slate-300 mt-4 font-medium">Nhấn để lật · Vuốt để chuyển</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-[22px] flex flex-col items-center justify-center p-7 text-center"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)',
            }}
          >
            <span className="absolute top-4 left-5 text-[9px] font-bold uppercase tracking-widest text-white/40">
              Định nghĩa
            </span>
            <p className="text-xl font-semibold text-white leading-relaxed italic">
              {card.definition}
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── MODE PILL ────────────────────────────────────────────
function ModePill({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs whitespace-nowrap flex-shrink-0 transition-all active:scale-95 border ${
        isActive
          ? 'text-white border-transparent shadow-md'
          : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
      }`}
      style={isActive ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 3px 10px rgba(79,70,229,.3)' } : {}}
    >
      <span className="text-sm">{icon}</span>
      {label}
    </button>
  )
}

// ─── VOCAB ROW ────────────────────────────────────────────
function VocabRow({
  card,
  mastered,
  onToggle,
}: {
  card: Card
  mastered: boolean
  onToggle: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
        mastered
          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900'
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
      }`}
    >
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all border-2 ${
          mastered
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-slate-200 dark:border-slate-700 text-transparent hover:border-emerald-400'
        }`}
      >
        <Check className="w-3 h-3" />
      </button>
      <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{card.term}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 pl-3 border-l border-slate-100 dark:border-slate-800 truncate">
          {card.definition}
        </p>
      </div>
    </motion.div>
  )
}

// ─── SKELETON ─────────────────────────────────────────────
function Skeleton({ h = 56 }: { h?: number }) {
  return <div className="animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" style={{ height: h }} />
}

// ─── MAIN PAGE ────────────────────────────────────────────
export default function SetDetailPage() {
  const { id } = useParams()
  const supabase = createClient()
  const router = useRouter()

  const [cards, setCards] = useState<Card[]>([])
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set())
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [activeMode, setActiveMode] = useState<Mode>('flashcards')

  const [isAdding, setIsAdding] = useState(false)
  const [newTerm, setNewTerm] = useState('')
  const [newDef, setNewDef] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const addFormRef = useRef<HTMLDivElement>(null)

  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkText, setBulkText] = useState('')

  // Mark viewed
  useEffect(() => {
    const setId = Array.isArray(id) ? id[0] : id
    if (setId) markSetViewed(String(setId))
  }, [id])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: setData }, { data: cardsData }, { data: progressData }] = await Promise.all([
        supabase.from('study_sets').select('title, description').eq('id', id).single(),
        supabase.from('cards').select('*').eq('set_id', id).order('id', { ascending: true }),
        supabase.from('learning_progress').select('card_id').eq('user_id', user.id).eq('status', 'mastered'),
      ])

      if (setData) { setTitle(setData.title); setDescription(setData.description || '') }
      if (cardsData) setCards(cardsData)
      if (progressData) setMasteredIds(new Set(progressData.map((p) => p.card_id)))
      setLoading(false)
    }
    fetchData()
  }, [id, supabase, router])

  const toggleMastered = useCallback(async (cardId: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const was = masteredIds.has(cardId)
    const next = new Set(masteredIds)
    if (was) next.delete(cardId); else next.add(cardId)
    setMasteredIds(next)
    await supabase.from('learning_progress').upsert(
      { user_id: user.id, card_id: cardId, status: was ? 'learning' : 'mastered', last_reviewed: new Date().toISOString() },
      { onConflict: 'user_id, card_id' }
    )
  }, [masteredIds, supabase])

  const handleAddCard = async () => {
    if (!newTerm.trim() || !newDef.trim()) return
    setIsSubmitting(true)
    const { data, error } = await supabase
      .from('cards')
      .insert([{ set_id: id, term: newTerm.trim(), definition: newDef.trim() }])
      .select()
    if (!error && data) {
      setCards((prev) => [...prev, ...data])
      setNewTerm('')
      setNewDef('')
    }
    setIsSubmitting(false)
  }

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return
    setIsSubmitting(true)
    const newCards = bulkText
      .split('\n')
      .map((line) => {
        const [term, ...rest] = line.split(',')
        const definition = rest.join(',').trim()
        if (term?.trim() && definition) return { set_id: id, term: term.trim(), definition }
        return null
      })
      .filter(Boolean) as { set_id: string; term: string; definition: string }[]

    if (newCards.length > 0) {
      const { data, error } = await supabase.from('cards').insert(newCards).select()
      if (!error && data) { setCards((prev) => [...prev, ...data]); setBulkText(''); setShowBulkModal(false) }
    }
    setIsSubmitting(false)
  }

  const handleSwipe = useCallback((dir: 1 | -1) => {
    if (dir === 1 && !masteredIds.has(cards[currentIndex]?.id)) {
      toggleMastered(cards[currentIndex].id)
    }
    setCurrentIndex((prev) => (prev + 1) % cards.length)
    setIsFlipped(false)
  }, [cards, currentIndex, masteredIds, toggleMastered])

  const progress = cards.length > 0 ? Math.round((masteredIds.size / cards.length) * 100) : 0

  // ── LOADING ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-slate-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Sora:wght@700&display=swap');
        body { font-family: 'DM Sans', sans-serif; }
        .pb-safe { padding-bottom: max(20px, env(safe-area-inset-bottom)); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] pb-24">

        {/* ── HEADER ── */}
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
          {/* Progress bar */}
          <div className="h-[3px] bg-slate-100 dark:bg-slate-800">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }}
            />
          </div>

          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-3 py-2 rounded-xl flex-shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>

            {/* Title trên header (truncate) */}
            <h1 className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate flex-1 text-center"
              style={{ fontFamily: "'Sora', sans-serif" }}>
              {title}
            </h1>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowBulkModal(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl"
              >
                <FileDown className="w-3 h-3" /> Hàng loạt
              </button>
              <button
                onClick={() => {
                  setIsAdding(true)
                  setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-2 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 3px 10px rgba(79,70,229,.3)' }}
              >
                <Plus className="w-3 h-3" /> Thêm thẻ
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">

          {/* ── META ── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight mb-1"
              style={{ fontFamily: "'Sora', sans-serif", letterSpacing: '-0.5px' }}>
              {title}
            </h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">
              {description || 'Cố lên BRO!!'}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 w-36 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }}
                  />
                </div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{progress}%</span>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                {masteredIds.size} / {cards.length} từ
              </span>
            </div>
          </div>

          {/* ── MODE PILLS ── */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            <ModePill icon={<BookOpen className="w-3.5 h-3.5" />} label="Thẻ ghi nhớ" isActive={activeMode === 'flashcards'} onClick={() => setActiveMode('flashcards')} />
            <ModePill icon={<Crown className="w-3.5 h-3.5" />} label="Flashcard" isActive={activeMode === 'flashcards-full'} onClick={() => router.push(`/dashboard/set/${id}/flashcards`)} />
            <ModePill icon={<Brain className="w-3.5 h-3.5" />} label="Học" isActive={activeMode === 'learn'} onClick={() => router.push(`/dashboard/set/${id}/learn`)} />
            <ModePill icon={<FileText className="w-3.5 h-3.5" />} label="Kiểm tra" isActive={activeMode === 'test'} onClick={() => router.push(`/dashboard/set/${id}/test`)} />
            <ModePill icon={<LayoutGrid className="w-3.5 h-3.5" />} label="Ghép thẻ" isActive={activeMode === 'match'} onClick={() => router.push(`/dashboard/set/${id}/match`)} />
          </div>

          {/* ── FLASHCARD VIEWER ── */}
          {activeMode === 'flashcards' && cards.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
              {/* Counter + shuffle */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  Thẻ {currentIndex + 1} / {cards.length}
                </span>
                <button
                  onClick={() => { setCurrentIndex(Math.floor(Math.random() * cards.length)); setIsFlipped(false) }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1.5 rounded-lg"
                >
                  <RotateCw className="w-3 h-3" /> Xáo trộn
                </button>
              </div>

              {/* Card */}
              <div className="relative h-52 mb-4">
                <AnimatePresence mode="wait">
                  <SwipeableCard
                    key={currentIndex}
                    card={cards[currentIndex]}
                    isFlipped={isFlipped}
                    setIsFlipped={setIsFlipped}
                    onSwipe={handleSwipe}
                  />
                </AnimatePresence>
              </div>

              {/* Dot indicators */}
              <div className="flex justify-center gap-1.5 mb-4">
                {cards.slice(0, Math.min(cards.length, 7)).map((_, i) => (
                  <div
                    key={i}
                    onClick={() => { setCurrentIndex(i); setIsFlipped(false) }}
                    className={`rounded-full cursor-pointer transition-all ${
                      i === currentIndex
                        ? 'w-5 h-1.5 bg-indigo-500'
                        : masteredIds.has(cards[i]?.id)
                        ? 'w-1.5 h-1.5 bg-emerald-400'
                        : 'w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
                {cards.length > 7 && <span className="text-[10px] text-slate-300 self-center">+{cards.length - 7}</span>}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-5">
                <button
                  onClick={() => { setIsFlipped(false); setCurrentIndex((p) => (p - 1 + cards.length) % cards.length) }}
                  className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors active:scale-90"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={() => toggleMastered(cards[currentIndex].id)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    masteredIds.has(cards[currentIndex].id)
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900'
                      : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-300 hover:border-emerald-400 hover:text-emerald-400'
                  }`}
                >
                  <Check className="w-6 h-6" />
                </button>

                <button
                  onClick={() => { setIsFlipped(false); setCurrentIndex((p) => (p + 1) % cards.length) }}
                  className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors active:scale-90"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ── EMPTY STATE ── */}
          {activeMode === 'flashcards' && cards.length === 0 && !loading && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 border border-slate-100 dark:border-slate-800 text-center">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-7 h-7 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">Chưa có thẻ nào</p>
              <p className="text-xs text-slate-400 mb-4">Thêm thẻ đầu tiên để bắt đầu học!</p>
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-4 py-2 rounded-xl"
              >
                <Plus className="w-4 h-4" /> Thêm thẻ đầu tiên
              </button>
            </div>
          )}

          {/* ── VOCAB LIST ── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-50 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white"
                style={{ fontFamily: "'Sora', sans-serif" }}>
                Tất cả từ vựng
                <span className="ml-2 text-xs font-normal text-slate-400">({cards.length})</span>
              </h3>
              <button
                onClick={() => {
                  setIsAdding(true)
                  setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm
              </button>
            </div>

            <div className="p-3 space-y-2">
              {loading
                ? [...Array(5)].map((_, i) => <Skeleton key={i} h={52} />)
                : cards.map((card) => (
                    <VocabRow
                      key={card.id}
                      card={card}
                      mastered={masteredIds.has(card.id)}
                      onToggle={() => toggleMastered(card.id)}
                    />
                  ))}
            </div>

            {/* Add form */}
            <div ref={addFormRef} className="px-3 pb-3">
              <AnimatePresence>
                {isAdding ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/30 p-4 relative">
                      <button
                        onClick={() => setIsAdding(false)}
                        className="absolute top-3 right-3 text-slate-300 hover:text-slate-500 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
                        Thêm thẻ mới
                      </p>

                      <div className="grid grid-cols-1 gap-2.5 mb-3">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 ml-1">
                            Thuật ngữ
                          </label>
                          <input
                            autoFocus
                            value={newTerm}
                            onChange={(e) => setNewTerm(e.target.value)}
                            placeholder="VD: Meticulous"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 ml-1">
                            Định nghĩa
                          </label>
                          <input
                            value={newDef}
                            onChange={(e) => setNewDef(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCard()}
                            placeholder="VD: Tỉ mỉ, cẩn thận"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsAdding(false)}
                          className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-500 dark:text-slate-400"
                        >
                          Huỷ
                        </button>
                        <button
                          onClick={handleAddCard}
                          disabled={isSubmitting || !newTerm.trim() || !newDef.trim()}
                          className="flex-2 flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                        >
                          <Send className="w-3.5 h-3.5" />
                          {isSubmitting ? 'Đang lưu...' : 'Lưu & thêm tiếp'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => {
                      setIsAdding(true)
                      setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
                    }}
                    className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm font-semibold flex items-center justify-center gap-2 hover:border-indigo-300 hover:text-indigo-400 transition-all mt-1"
                  >
                    <Plus className="w-4 h-4" /> Thêm thẻ mới
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </div>

      {/* ── BULK IMPORT MODAL ── */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulkModal(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white"
                    style={{ fontFamily: "'Sora', sans-serif" }}>
                    Nhập hàng loạt 🚀
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Mỗi dòng: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">thuật ngữ, định nghĩa</code></p>
                </div>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`Meticulous, Tỉ mỉ cẩn thận\nEloquent, Hùng hồn lưu loát\nProliferate, Sinh sôi lan rộng`}
                className="w-full h-52 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 resize-none transition mb-4 font-mono"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-500 dark:text-slate-400"
                >
                  Huỷ
                </button>
                <button
                  onClick={handleBulkImport}
                  disabled={isSubmitting || !bulkText.trim()}
                  className="flex-1 py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-50 transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                >
                  {isSubmitting ? 'Đang xử lý...' : `Nhập ${bulkText.trim().split('\n').filter((l) => l.includes(',')).length} thẻ`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
