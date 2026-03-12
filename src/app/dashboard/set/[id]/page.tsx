"use client"
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  BookOpen,
  ArrowLeft,
  RotateCw,
  Plus,
  Send,
  X,
  PlusCircle
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

  // States cho tính năng Thêm từ
  const [isAdding, setIsAdding] = useState(false)
  const [newTerm, setNewTerm] = useState('')
  const [newDefinition, setNewDefinition] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: setData } = await supabase.from('study_sets').select('title, description').eq('id', id).single()
      if (setData) {
        setTitle(setData.title); setDescription(setData.description || '')
      }

      const { data: cardsData } = await supabase.from('cards').select('*').eq('set_id', id).order('id', { ascending: true })
      const { data: progressData } = await supabase.from('learning_progress').select('card_id').eq('user_id', user.id).eq('status', 'mastered')

      if (cardsData) setCards(cardsData)
      if (progressData) setMasteredIds(new Set(progressData.map(p => p.card_id)))
      setLoading(false)
    }
    fetchData()
  }, [id, supabase])

  // Hàm mở ô nhập và cuộn xuống
  const openAddInput = () => {
    setIsAdding(true)
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleAddCard = async () => {
    if (!newTerm.trim() || !newDefinition.trim()) return
    setIsSubmitting(true)

    const { data, error } = await supabase
      .from('cards')
      .insert([{ set_id: id, term: newTerm, definition: newDefinition }])
      .select()

    if (!error && data) {
      setCards([...cards, ...data])
      setNewTerm(''); setNewDefinition('')
    }
    setIsSubmitting(false)
  }

  const toggleMastered = async (cardId: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const isAlreadyMastered = masteredIds.has(cardId)
    const { error } = await supabase.from('learning_progress').upsert({ user_id: user.id, card_id: cardId, status: isAlreadyMastered ? 'learning' : 'mastered', last_reviewed: new Date().toISOString() }, { onConflict: 'user_id, card_id' })
    if (!error) {
      const newMastered = new Set(masteredIds)
      if (isAlreadyMastered) newMastered.delete(cardId); else newMastered.add(cardId)
      setMasteredIds(newMastered)
    }
  }

  const nextCard = () => { setIsFlipped(false); setCurrentIndex((prev) => (prev + 1) % cards.length) }
  const prevCard = () => { setIsFlipped(false); setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length) }
  const progress = cards.length > 0 ? Math.round((masteredIds.size / cards.length) * 100) : 0

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white text-emerald-600">Đang tải...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-emerald-50 pb-20 font-sans">
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-3 flex justify-between items-center max-w-4xl mx-auto w-full">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 font-medium"><ArrowLeft className="w-4 h-4" /> Dashboard</Link>
        <button onClick={openAddInput} className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1 shadow-md shadow-emerald-100"><Plus className="w-3 h-3" /> Thêm thẻ</button>
      </nav>

      <div className="h-1 bg-slate-100"><motion.div className="h-full bg-emerald-500" animate={{ width: `${progress}%` }} /></div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">{title}</h1>
          <p className="text-slate-500 text-base">{description}</p>
        </div>

        {/* Flashcard Area */}
        {cards.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-sm font-bold text-slate-400">Thẻ {currentIndex + 1} / {cards.length}</span>
              <button onClick={() => {setCurrentIndex(Math.floor(Math.random() * cards.length)); setIsFlipped(false)}} className="text-sm font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1 rounded-lg transition flex items-center gap-1"><RotateCw className="w-3 h-3" /> Xáo trộn</button>
            </div>
            <motion.div className="relative h-72 md:h-96 perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
              <motion.div className="w-full h-full preserve-3d shadow-2xl rounded-3xl" animate={{ rotateY: isFlipped ? 180 : 0 }}>
                <div className="absolute inset-0 backface-hidden bg-white rounded-3xl border border-slate-100 p-8 flex items-center justify-center text-4xl font-bold text-slate-800 text-center">{cards[currentIndex].term}</div>
                <div className="absolute inset-0 backface-hidden bg-emerald-600 rounded-3xl rotate-y-180 p-8 flex items-center justify-center text-2xl text-white text-center leading-relaxed">{cards[currentIndex].definition}</div>
              </motion.div>
            </motion.div>
            <div className="flex items-center justify-center gap-8 mt-8">
              <button onClick={prevCard} className="w-14 h-14 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center hover:bg-emerald-50 transition-all active:scale-90 text-slate-400">←</button>
              <button onClick={() => toggleMastered(cards[currentIndex].id)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-90 ${masteredIds.has(cards[currentIndex].id) ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white border-2 border-slate-200 text-slate-300 hover:text-emerald-500'}`}><Check className="w-8 h-8" /></button>
              <button onClick={nextCard} className="w-14 h-14 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center hover:bg-emerald-50 transition-all active:scale-90 text-slate-400">→</button>
            </div>
          </div>
        )}

        {/* Danh sách thẻ */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Thành phần bài học</h2>
              {/* NÚT THÊM NHANH NGAY CẠNH TIÊU ĐỀ */}
              <button 
                onClick={openAddInput}
                className="p-1 text-emerald-600 hover:text-emerald-700 hover:scale-110 transition-all"
                title="Thêm từ mới nhanh"
              >
                <PlusCircle className="w-7 h-7" />
              </button>
            </div>
            <div className="text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full">
               {progress}% hoàn thành
            </div>
          </div>

          <div className="space-y-4">
            {cards.map((card) => (
              <div key={card.id} className={`bg-white rounded-2xl p-6 border ${masteredIds.has(card.id) ? 'border-emerald-100 bg-emerald-50/20 shadow-sm' : 'border-slate-100'} flex items-center gap-8 shadow-sm group hover:border-emerald-300 transition-all`}>
                <button onClick={() => toggleMastered(card.id)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${masteredIds.has(card.id) ? 'bg-emerald-500 text-white' : 'border-2 border-slate-200 text-transparent hover:border-emerald-400'}`}><Check className="w-4 h-4" /></button>
                <div className="flex-1 grid md:grid-cols-2 gap-4">
                  <p className="font-bold text-slate-800 text-lg">{card.term}</p>
                  <p className="text-slate-500 text-base md:border-l md:pl-8 border-slate-100">{card.definition}</p>
                </div>
              </div>
            ))}

            {/* Ô nhập liệu inline */}
            {isAdding ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl p-8 border-2 border-emerald-400 shadow-2xl mt-8 relative"
              >
                <button onClick={() => setIsAdding(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-black uppercase text-emerald-600 tracking-widest ml-1 mb-2 block">Thuật ngữ</label>
                    <input autoFocus value={newTerm} onChange={e => setNewTerm(e.target.value)} placeholder="VD: Meticulous" className="w-full p-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-2 ring-emerald-200 font-bold transition-all text-lg" />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-emerald-600 tracking-widest ml-1 mb-2 block">Định nghĩa</label>
                    <input value={newDefinition} onChange={e => setNewDefinition(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCard()} placeholder="VD: Tỉ mỉ, kỹ lưỡng" className="w-full p-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-2 ring-emerald-200 transition-all text-lg" />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <button onClick={handleAddCard} disabled={isSubmitting} className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-50 active:scale-95">
                    <Send className="w-4 h-4" /> {isSubmitting ? 'Đang lưu...' : 'Lưu và thêm tiếp'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <button 
                onClick={openAddInput}
                className="w-full py-8 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold hover:border-emerald-400 hover:text-emerald-600 transition-all mt-6 flex items-center justify-center gap-3 group"
              >
                <Plus className="w-6 h-6 group-hover:scale-125 transition-transform" /> THÊM THẺ MỚI VÀO HỌC PHẦN
              </button>
            )}
            <div ref={bottomRef} className="h-10" /> 
          </div>
        </section>
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