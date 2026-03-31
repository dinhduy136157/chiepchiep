"use client"
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, Timer, Trophy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function MatchGamePage() {
  const { id } = useParams()
  const supabase = createClient()
  const router = useRouter()

  const [gameCards, setGameCards] = useState<any[]>([])
  const [selected, setSelected] = useState<any[]>([])
  const [matched, setMatched] = useState<number[]>([]) // Chuyển về lưu number ID
  const [time, setTime] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isWrong, setIsWrong] = useState(false) // Hiệu ứng chọn sai

  const shuffleArray = (array: any[]) => [...array].sort(() => Math.random() - 0.5)

  useEffect(() => {
    const fetchAndPrepare = async () => {
      const { data } = await supabase.from('cards').select('*').eq('set_id', id).limit(6)
      if (data && data.length >= 3) {
        const terms = data.map(c => ({ gameId: Math.random(), id: c.id, content: c.term, type: 'term' }))
        const defs = data.map(c => ({ gameId: Math.random(), id: c.id, content: c.definition, type: 'definition' }))
        setGameCards(shuffleArray([...terms, ...defs]))
      } else {
        alert("Duy cần ít nhất 3 thẻ để chơi trò này!")
        router.back()
      }
      setLoading(false)
    }
    fetchAndPrepare()
  }, [id, supabase, router])

  useEffect(() => {
    let interval: any
    if (!isFinished && !loading) {
      interval = setInterval(() => setTime(prev => prev + 0.1), 100)
    }
    return () => clearInterval(interval)
  }, [isFinished, loading])

  const handleSelect = (card: any) => {
    // Không cho chọn nếu đã match, hoặc đang trong hiệu ứng "sai", hoặc chọn lại chính nó
    if (matched.includes(card.id) || isWrong || selected.some(s => s.gameId === card.gameId)) return

    const newSelected = [...selected, card]
    setSelected(newSelected)

    if (newSelected.length === 2) {
      const [first, second] = newSelected
      
      if (first.id === second.id && first.type !== second.type) {
        // ĐÚNG CẶP
        setTimeout(() => {
          const newMatched = [...matched, first.id]
          setMatched(newMatched)
          setSelected([])
          if (newMatched.length === gameCards.length / 2) {
            setIsFinished(true)
          }
        }, 200)
      } else {
        // SAI CẶP
        setIsWrong(true)
        setTimeout(() => {
          setSelected([])
          setIsWrong(false)
        }, 600)
      }
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center font-black text-emerald-600 animate-bounce text-2xl tracking-tighter italic">DUYVOCAB MATCH...</div>
    </div>
  )

  if (isFinished) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-12 text-center shadow-2xl border-4 border-emerald-400 max-w-md w-full">
        <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-6 animate-bounce" />
        <h2 className="text-4xl font-black text-slate-800 mb-2 italic tracking-tighter uppercase">Xuất sắc!</h2>
        <p className="text-slate-500 mb-8 font-bold text-lg">Hoàn thành trong <span className="text-emerald-600 text-3xl block mt-2">{time.toFixed(1)} giây</span></p>
        <div className="flex flex-col gap-3">
          <button onClick={() => window.location.reload()} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all uppercase tracking-widest active:scale-95">Chơi lại ↻</button>
          <button onClick={() => router.back()} className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase text-xs tracking-widest">Quay lại học phần</button>
        </div>
      </motion.div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 flex flex-col items-center">
      <div className="w-full max-w-5xl flex justify-between items-center mb-10">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:bg-slate-900/70 dark:text-slate-200 dark:border-slate-700">
          <ArrowLeft className="w-4 h-4" /> Thoát
        </button>
        <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-md border border-emerald-100 dark:bg-slate-900/70 dark:border-slate-700">
          <Timer className="w-5 h-5 text-emerald-500" />
          <span className="font-mono text-2xl font-black text-slate-700 w-16 text-center dark:text-slate-100">{time.toFixed(1)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-5xl">
        <AnimatePresence>
          {gameCards.map((card) => {
            const isSelected = selected.some(s => s.gameId === card.gameId)
            const isMatched = matched.includes(card.id)

            return (
              <motion.div
                key={card.gameId}
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  x: isWrong && isSelected ? [0, -10, 10, -10, 10, 0] : 0 // Shake nếu sai
                }}
                exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelect(card)}
                className={`h-32 md:h-44 p-4 rounded-[2rem] flex items-center justify-center text-center cursor-pointer transition-all border-4 shadow-sm font-bold text-sm md:text-lg leading-tight overflow-hidden select-none ${
                  isMatched
                    ? 'opacity-0 pointer-events-none invisible'
                    : isSelected 
                    ? isWrong 
                      ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-rose-100 dark:bg-rose-500/20 dark:text-rose-100' // Màu đỏ khi sai
                      : 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-100' // Màu xanh dương khi chọn
                    : 'border-white bg-white/90 backdrop-blur-sm hover:border-emerald-200 text-slate-700 shadow-xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:shadow-none'
                }`}
                style={{
                  backgroundImage:
                    "linear-gradient(to bottom, rgba(15,23,42,0.35), rgba(15,23,42,0.55)), url('/avatars/avatar-anh-meo-cute-5.jpg')",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <span className="px-2 py-1 rounded-lg bg-white/70 dark:bg-slate-900/70 backdrop-blur text-slate-800 dark:text-slate-100">
                  {card.content}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <div className="mt-16 text-center">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] italic bg-slate-100/50 px-6 py-2 rounded-full inline-block">
          Ghép thuật ngữ với định nghĩa đúng để chúng biến mất!
        </p>
      </div>
    </div>
  )
}



