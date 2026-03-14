"use client"
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { 
  ChevronLeft, ChevronRight, Check, BookOpen, RotateCw, 
  ArrowLeft, Plus, Send, X, PlusCircle, Brain, 
  FileText, LayoutGrid, Zap, Gamepad2, Volume2, FileDown, Crown
} from 'lucide-react'

// --- COMPONENT CON TỐI ƯU TRƯỢT SIÊU NHẠY CHO MOBILE ---
function SwipeableCard({ card, isFlipped, setIsFlipped, onSwipe }: any) {
  const x = useMotionValue(0);
  
  // Nghiêng thẻ nhẹ nhàng hơn để không bị lỗi hiển thị trên màn hình hẹp
  const rotate = useTransform(x, [-150, 150], [-15, 15]);
  
  // Opacity biến mất nhanh hơn khi thẻ bay ra khỏi tâm
  const opacity = useTransform(x, [-200, -120, 0, 120, 200], [0, 1, 1, 1, 0]);
  
  // Label hiện cực sớm (chỉ cần nhích 20px là bắt đầu thấy chữ)
  const họcLạiOpacity = useTransform(x, [-60, -20], [1, 0]);
  const đãBiếtOpacity = useTransform(x, [20, 60], [0, 1]);

  return (
    <motion.div
      style={{ x, rotate, opacity, touchAction: 'none' }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9} // Tăng độ co giãn để kéo cảm giác nhẹ tay hơn
      onDragEnd={(_, info) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        // NGƯỠNG SIÊU THẤP: Kéo quá 50px hoặc phẩy tay nhanh (>400) là tính luôn
        if (offset > 50 || velocity > 400) {
          onSwipe(1); // Sang phải -> Đã biết
        } else if (offset < -50 || velocity < -400) {
          onSwipe(-1); // Sang trái -> Học lại
        }
      }}
      onClick={() => {
        // Chỉ lật thẻ nếu người dùng chạm nhẹ (không phải đang kéo)
        if (Math.abs(x.get()) < 5) setIsFlipped(!isFlipped);
      }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing preserve-3d"
    >
      {/* Label HỌC LẠI (ĐỎ) */}
      <motion.div 
        style={{ opacity: họcLạiOpacity }} 
        className="absolute top-10 right-8 z-50 border-[3px] border-red-500 text-red-500 font-black px-4 py-1.5 rounded-xl rotate-12 text-lg pointer-events-none bg-white/90 shadow-sm"
      >
        HỌC LẠI
      </motion.div>

      {/* Label ĐÃ BIẾT (XANH) */}
      <motion.div 
        style={{ opacity: đãBiếtOpacity }} 
        className="absolute top-10 left-8 z-50 border-[3px] border-emerald-500 text-emerald-500 font-black px-4 py-1.5 rounded-xl -rotate-12 text-lg pointer-events-none bg-white/90 shadow-sm"
      >
        ĐÃ BIẾT
      </motion.div>

      <motion.div 
        className="w-full h-full preserve-3d shadow-xl rounded-[2.5rem]" 
        animate={{ rotateY: isFlipped ? 180 : 0 }} 
        transition={{ duration: 0.35, type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 flex items-center justify-center text-3xl md:text-5xl font-black text-slate-800 text-center leading-tight">
          {card.term}
          <div className="absolute top-6 left-8 text-[9px] font-black uppercase text-slate-300 tracking-widest">Front</div>
        </div>
        {/* Back */}
        <div className="absolute inset-0 backface-hidden bg-emerald-600 rounded-[2.5rem] rotate-y-180 p-8 flex items-center justify-center text-xl md:text-3xl text-white text-center leading-relaxed font-bold italic">
          {card.definition}
          <div className="absolute top-6 left-8 text-[9px] font-black uppercase text-emerald-200 tracking-widest">Back</div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function SetDetailPage() {
  const { id } = useParams()
  const supabase = createClient()
  const router = useRouter()
  
  const [cards, setCards] = useState<any[]>([])
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set())
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [activeTab, setActiveTab] = useState('flashcards')
  const isDraggingRef = useRef(false)

  const [isAdding, setIsAdding] = useState(false)
  const [newTerm, setNewTerm] = useState('')
  const [newDefinition, setNewDefinition] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkText, setBulkText] = useState('')

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

  const handleAddCard = async () => {
    if (!newTerm.trim() || !newDefinition.trim()) return
    setIsSubmitting(true)
    const { data, error } = await supabase.from('cards').insert([{ set_id: id, term: newTerm, definition: newDefinition }]).select()
    if (!error && data) {
      setCards([...cards, ...data])
      setNewTerm(''); setNewDefinition('')
    }
    setIsSubmitting(false)
  }

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return
    setIsSubmitting(true)
    const lines = bulkText.split('\n')
    const newCards = lines
      .map(line => {
        const [term, ...defParts] = line.split(',')
        const definition = defParts.join(',').trim()
        if (term && definition) return { set_id: id, term: term.trim(), definition }
        return null
      })
      .filter(card => card !== null)

    if (newCards.length > 0) {
      const { data, error } = await supabase.from('cards').insert(newCards).select()
      if (!error && data) {
        setCards([...cards, ...data])
        setBulkText(''); setShowBulkModal(false)
      }
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

  const progress = cards.length > 0 ? Math.round((masteredIds.size / cards.length) * 100) : 0

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-emerald-600 animate-pulse uppercase italic tracking-tighter">Đang nạp dữ liệu...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 pb-20 font-sans">
      <nav className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 font-bold transition-all">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="flex gap-2">
            <button onClick={() => setShowBulkModal(true)} className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-xs font-bold hover:bg-slate-200 transition-all">
              <FileDown className="w-3 h-3" /> Thêm hàng loạt
            </button>
            <button onClick={() => {setIsAdding(true); setTimeout(() => bottomRef.current?.scrollIntoView({behavior:'smooth'}), 100)}} className="bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1 shadow-lg shadow-emerald-100">
              <Plus className="w-3 h-3" /> Thêm thẻ
            </button>
          </div>
        </div>
      </nav>

      <div className="h-1 bg-slate-100"><motion.div className="h-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${progress}%` }} /></div>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">{title}</h1>
          <p className="text-slate-500 mt-2 font-medium">{description || "Học tập hiệu quả mỗi ngày cùng Chiep Chiep 🐣"}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-12">
          <ModeButton icon={<BookOpen className="w-5 h-5" />} label="Thẻ ghi nhớ" isActive={activeTab === 'flashcards'} onClick={() => setActiveTab('flashcards')} color="text-blue-500" bg="bg-blue-50" />
          <ModeButton icon={<Brain className="w-5 h-5" />} label="Học" onClick={() => router.push(`/dashboard/set/${id}/learn`)} color="text-indigo-500" bg="bg-indigo-50" />
          <ModeButton icon={<FileText className="w-5 h-5" />} label="Kiểm tra" onClick={() => router.push(`/dashboard/set/${id}/test`)} color="text-emerald-500" bg="bg-emerald-50" />
          <ModeButton icon={<LayoutGrid className="w-5 h-5" />} label="Ghép thẻ" onClick={() => router.push(`/dashboard/set/${id}/match`)} color="text-orange-500" bg="bg-orange-50" />
          <ModeButton icon={<Zap className="w-5 h-5" />} label="Blast" onClick={() => router.push(`/dashboard/set/${id}/blast`)} color="text-rose-500" bg="bg-rose-50" />
          <ModeButton icon={<Gamepad2 className="w-5 h-5" />} label="Game" color="text-purple-500" bg="bg-purple-50" />
        </div>

        {/* 3D FLASHCARD AREA - ĐÃ CẬP NHẬT TRƯỢT KIỂU QUIZLET */}
        {activeTab === 'flashcards' && cards.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-sm font-bold text-slate-400 italic">Thẻ {currentIndex + 1} / {cards.length}</span>
              <button onClick={() => {setCurrentIndex(Math.floor(Math.random() * cards.length)); setIsFlipped(false)}} className="text-sm font-bold text-emerald-600 flex items-center gap-1 hover:bg-emerald-50 px-3 py-1 rounded-lg transition"><RotateCw className="w-3 h-3" /> Xáo trộn</button>
            </div>

            <div className="relative h-72 md:h-[420px] perspective-1000">
              <AnimatePresence mode="wait">
                <SwipeableCard
                  key={currentIndex}
                  card={cards[currentIndex]}
                  isFlipped={isFlipped}
                  setIsFlipped={setIsFlipped}
                  onSwipe={(dir: number) => {
                    // Nếu vuốt phải (1) -> Đánh dấu đã học
                    if (dir === 1 && !masteredIds.has(cards[currentIndex].id)) {
                      toggleMastered(cards[currentIndex].id);
                    }
                    // Chuyển thẻ tiếp theo
                    setCurrentIndex((prev) => (prev + 1) % cards.length);
                    setIsFlipped(false);
                  }}
                />
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-center gap-8 mt-10">
              <button onClick={() => {setIsFlipped(false); setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)}} className="w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-emerald-50 transition-all border border-slate-100 font-bold text-slate-400">←</button>
              <button onClick={(e) => { e.stopPropagation(); toggleMastered(cards[currentIndex].id) }} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl ${masteredIds.has(cards[currentIndex].id) ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white border-2 border-slate-200 text-slate-300 hover:text-emerald-500'}`}><Check className="w-8 h-8" /></button>
              <button onClick={() => {setIsFlipped(false); setCurrentIndex((prev) => (prev + 1) % cards.length)}} className="w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-emerald-50 transition-all border border-slate-100 font-bold text-slate-400">→</button>
            </div>
          </div>
        )}

        {/* LIST & INLINE ADDING */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Thành phần bài học</h2>
              <button onClick={() => {setIsAdding(true); setTimeout(() => bottomRef.current?.scrollIntoView({behavior:'smooth'}), 100)}} className="p-1 text-emerald-600 hover:scale-110 transition-all"><PlusCircle className="w-7 h-7" /></button>
            </div>
            <div className="text-sm font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full">{progress}% HOÀN THÀNH</div>
          </div>

          <div className="space-y-4">
            {cards.map((card) => (
              <div key={card.id} className={`bg-white rounded-3xl p-7 border ${masteredIds.has(card.id) ? 'border-emerald-100 bg-emerald-50/20 shadow-sm' : 'border-slate-50'} flex items-center gap-8 shadow-sm group hover:border-emerald-300 transition-all`}>
                <button onClick={() => toggleMastered(card.id)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${masteredIds.has(card.id) ? 'bg-emerald-500 text-white' : 'border-2 border-slate-200 text-transparent hover:border-emerald-400'}`}><Check className="w-4 h-4" /></button>
                <div className="flex-1 grid md:grid-cols-2 gap-4">
                  <p className="font-black text-slate-800 text-xl tracking-tight">{card.term}</p>
                  <p className="text-slate-500 font-medium md:border-l md:pl-8 border-slate-100">{card.definition}</p>
                </div>
              </div>
            ))}

            {isAdding ? (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] p-10 border-2 border-emerald-400 shadow-2xl mt-8 relative">
                <button onClick={() => setIsAdding(false)} className="absolute top-6 right-8 text-slate-300 hover:text-slate-500"><X /></button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest ml-1 mb-2 block">Thuật ngữ mới</label>
                    <input autoFocus value={newTerm} onChange={e => setNewTerm(e.target.value)} placeholder="VD: IELTS" className="w-full p-5 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-2 ring-emerald-200 font-black transition-all text-lg" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest ml-1 mb-2 block">Định nghĩa</label>
                    <input value={newDefinition} onChange={e => setNewDefinition(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCard()} placeholder="VD: Hệ thống kiểm tra tiếng Anh" className="w-full p-5 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-2 ring-emerald-200 transition-all text-lg" />
                  </div>
                </div>
                <div className="flex justify-end mt-8">
                  <button onClick={handleAddCard} disabled={isSubmitting} className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-slate-900 transition-all disabled:opacity-50">
                    <Send className="w-4 h-4" /> {isSubmitting ? 'ĐANG LƯU...' : 'LƯU VÀ THÊM TIẾP'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <button onClick={() => {setIsAdding(true); setTimeout(() => bottomRef.current?.scrollIntoView({behavior:'smooth'}), 100)}} className="w-full py-10 bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 font-black hover:border-emerald-400 hover:text-emerald-600 transition-all mt-6 flex items-center justify-center gap-3 uppercase tracking-widest text-sm">
                <Plus className="w-6 h-6" /> Thêm thẻ mới
              </button>
            )}
            <div ref={bottomRef} className="h-10" /> 
          </div>
        </section>
      </main>

      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black italic tracking-tighter uppercase">Nhập hàng loạt 🚀</h3>
                <button onClick={() => setShowBulkModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
              </div>
              <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Dán danh sách từ vựng vào đây..." className="w-full h-72 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-2 ring-emerald-100 transition-all font-bold text-sm resize-none mb-8" />
              <button onClick={handleBulkImport} disabled={isSubmitting || !bulkText.trim()} className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl hover:bg-slate-900 transition-all uppercase tracking-widest disabled:bg-slate-100">
                {isSubmitting ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN NHẬP DỮ LIỆU'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  )
}

function ModeButton({ icon, label, isActive, onClick, color, bg }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 p-4 rounded-2xl transition-all border-2 ${isActive ? `border-emerald-500 bg-white shadow-lg shadow-emerald-100 scale-105` : 'border-white bg-white hover:border-slate-100 shadow-sm'}`}>
      <div className={`p-2 rounded-xl ${bg} ${color}`}>{icon}</div>
      <span className={`text-sm font-black ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>{label}</span>
    </button>
  )
}