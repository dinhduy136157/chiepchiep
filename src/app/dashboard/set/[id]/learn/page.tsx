"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

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

  if (cards.length === 0) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex flex-col items-center p-6">
      <div className="w-full max-w-3xl flex justify-between items-center mb-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-semibold hover:text-slate-700"><ArrowLeft className="w-4 h-4" /> Back</button>
        <div className="text-xs font-semibold text-slate-400 tracking-widest">PROGRESS {currentIndex + 1} / {cards.length}</div>
      </div>

      <div className="w-full max-w-3xl bg-white/80 backdrop-blur-sm rounded-[2.5rem] p-10 shadow-xl border border-slate-100 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-black text-indigo-500 uppercase tracking-[0.35em] mb-8"><Sparkles className="w-4 h-4" /> Definition</div>
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
          placeholder="Type the term..."
        />

        {status === 'wrong' && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-emerald-600 font-bold italic">Hint: {cards[currentIndex].term}</motion.p>
        )}
      </div>
    </div>
  )
}



