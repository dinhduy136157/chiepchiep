"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, Check, X, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LearnPage() {
  const { id } = useParams()
  const supabase = createClient()
  const router = useRouter()

  const [cards, setCards] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')

  useEffect(() => {
    const fetchCards = async () => {
      const { data } = await supabase.from('cards').select('*').eq('set_id', id)
      if (data) setCards(data)
    }
    fetchCards()
  }, [id, supabase])

  const checkAnswer = async () => {
    const isRight = userInput.trim().toLowerCase() === cards[currentIndex].term.toLowerCase()
    
    if (isRight) {
      setStatus('correct')
      // Tự động cập nhật tiến độ vào database luôn cho Duy
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('learning_progress').upsert({
          user_id: user.id,
          card_id: cards[currentIndex].id,
          status: 'mastered'
        }, { onConflict: 'user_id, card_id' })
      }
      
      setTimeout(() => {
        if (currentIndex < cards.length - 1) {
          setCurrentIndex(prev => prev + 1)
          setUserInput('')
          setStatus('idle')
        } else {
          alert("Chúc mừng Duy đã hoàn thành bộ thẻ!")
          router.back()
        }
      }, 1000)
    } else {
      setStatus('wrong')
    }
  }

  if (cards.length === 0) return <div className="p-20 text-center">Đang chuẩn bị bài học...</div>

  return (
    <div className="min-h-screen bg-[#f6f7fb] flex flex-col items-center p-6">
      <div className="w-full max-w-2xl flex justify-between items-center mb-10">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold"><ArrowLeft /> Thoát</button>
        <div className="text-sm font-black text-slate-400">TIẾN ĐỘ: {currentIndex + 1} / {cards.length}</div>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-[3rem] p-12 shadow-xl border border-slate-100 text-center">
        <h2 className="text-sm font-black text-indigo-500 uppercase tracking-[0.3em] mb-10">Định nghĩa</h2>
        <p className="text-3xl font-bold text-slate-800 mb-12 leading-relaxed">"{cards[currentIndex].definition}"</p>

        <input 
          autoFocus
          value={userInput}
          onChange={(e) => { setUserInput(e.target.value); setStatus('idle') }}
          onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
          className={`w-full p-6 rounded-2xl border-2 text-center text-2xl font-black transition-all outline-none ${
            status === 'correct' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' :
            status === 'wrong' ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-100 bg-slate-50 focus:border-indigo-500'
          }`}
          placeholder="Gõ từ tiếng Anh..."
        />

        {status === 'wrong' && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-emerald-600 font-bold italic">
            Gợi ý: {cards[currentIndex].term}
          </motion.p>
        )}
      </div>
    </div>
  )
}