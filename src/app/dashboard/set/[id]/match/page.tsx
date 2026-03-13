"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, Timer, Trophy, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function MatchGamePage() {
  const { id } = useParams()
  const supabase = createClient()
  const router = useRouter()

  const [gameCards, setGameCards] = useState<any[]>([])
  const [selected, setSelected] = useState<any[]>([])
  const [matched, setMatched] = useState<string[]>([]) // Lưu ID của các cặp đã đúng
  const [time, setTime] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAndPrepare = async () => {
      const { data } = await supabase.from('cards').select('*').eq('set_id', id).limit(6) // Lấy 6 cặp cho vừa màn hình
      if (data && data.length >= 3) {
        // Tạo ra 2 tập: một tập Term, một tập Definition
        const terms = data.map(c => ({ id: c.id, content: c.term, type: 'term' }))
        const defs = data.map(c => ({ id: c.id, content: c.definition, type: 'definition' }))
        
        // Trộn lẫn lộn tất cả
        setGameCards([...terms, ...defs].sort(() => Math.random() - 0.5))
      } else {
        alert("Duy cần ít nhất 3 thẻ để chơi trò này!")
        router.back()
      }
      setLoading(false)
    }
    fetchAndPrepare()
  }, [id, supabase, router])

  // Bộ đếm thời gian
  useEffect(() => {
    let interval: any
    if (!isFinished && !loading) {
      interval = setInterval(() => setTime(prev => prev + 0.1), 100)
    }
    return () => clearInterval(interval)
  }, [isFinished, loading])

  const handleSelect = (card: any) => {
    if (matched.includes(card.id) || selected.some(s => s.content === card.content)) return

    const newSelected = [...selected, card]
    setSelected(newSelected)

    if (newSelected.length === 2) {
      if (newSelected[0].id === newSelected[1].id && newSelected[0].type !== newSelected[1].type) {
        // Đúng cặp!
        setMatched(prev => [...prev, card.id])
        setSelected([])
        if (matched.length + 1 === gameCards.length / 2) setIsFinished(true)
      } else {
        // Sai rồi!
        setTimeout(() => setSelected([]), 500)
      }
    }
  }

  if (loading) return <div className="p-20 text-center font-black text-emerald-600 animate-bounce text-2xl tracking-tighter italic">CHIEP CHIEP MATCH...</div>

  if (isFinished) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-12 text-center shadow-2xl border-4 border-emerald-400">
        <Trophy className="w-24 h-24 text-amber-400 mx-auto mb-6 animate-bounce" />
        <h2 className="text-4xl font-black text-slate-800 mb-2 italic tracking-tighter">XUẤT SẮC!</h2>
        <p className="text-slate-500 mb-8 font-bold">Duy hoàn thành trong <span className="text-emerald-600 text-2xl">{time.toFixed(1)} giây</span></p>
        <button onClick={() => window.location.reload()} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all mb-4 uppercase tracking-widest">Chơi lại ↻</button>
        <button onClick={() => router.back()} className="w-full py-5 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase text-xs tracking-widest">Quay lại học phần</button>
      </motion.div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl flex justify-between items-center mb-10">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-black text-sm uppercase tracking-widest hover:text-emerald-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Thoát
        </button>
        <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100">
          <Timer className="w-5 h-5 text-emerald-500" />
          <span className="font-mono text-xl font-black text-slate-700">{time.toFixed(1)}s</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-4xl">
        {gameCards.map((card, idx) => {
          const isSelected = selected.some(s => s.content === card.content)
          const isMatched = matched.includes(card.id)

          return (
            <motion.div
              key={idx}
              layout
              initial={{ scale: 0 }}
              animate={{ scale: isMatched ? 0 : 1 }}
              whileHover={{ scale: isMatched ? 0 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(card)}
              className={`h-32 md:h-40 p-4 rounded-3xl flex items-center justify-center text-center cursor-pointer transition-all border-2 shadow-sm font-bold text-sm md:text-base leading-relaxed overflow-hidden ${
                isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-emerald-100' : 
                'border-white bg-white hover:border-emerald-200 text-slate-700'
              }`}
            >
              {card.content}
            </motion.div>
          )
        })}
      </div>

      <div className="mt-12 text-center">
        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] italic">Ghép thuật ngữ với định nghĩa đúng để chúng biến mất!</p>
      </div>
    </div>
  )
}