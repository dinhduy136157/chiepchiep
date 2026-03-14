"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Check, X, Trophy, ArrowLeft, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function TestPage() {
  const { id } = useParams()
  const supabase = createClient()
  const router = useRouter()

  const [cards, setCards] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [options, setOptions] = useState<any[]>([])
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [testType, setTestType] = useState<'en-vi' | 'vi-en'>('vi-en')

  useEffect(() => {
    const fetchCards = async () => {
      const { data } = await supabase.from('cards').select('*').eq('set_id', id)
      if (data && data.length >= 4) {
        setCards(shuffleArray(data))
      } else {
        alert("Duy cần ít nhất 4 thẻ để bắt đầu bài kiểm tra nhé!")
        router.back()
      }
    }
    fetchCards()
  }, [id, supabase, router])

  const shuffleArray = (array: any[]) => [...array].sort(() => Math.random() - 0.5)

  useEffect(() => {
    if (cards.length > 0 && currentIndex < cards.length) {
      const currentCard = cards[currentIndex]
      const otherCards = cards.filter(c => c.id !== currentCard.id)
      const distractors = shuffleArray(otherCards).slice(0, 3)
      setTestType(Math.random() > 0.5 ? 'vi-en' : 'en-vi')
      setOptions(shuffleArray([currentCard, ...distractors]))
      setSelectedAnswer(null)
      setIsCorrect(null)
    }
  }, [currentIndex, cards])

  const handleSelect = (option: any) => {
    if (selectedAnswer) return 

    const correctValue = testType === 'vi-en' ? cards[currentIndex].term : cards[currentIndex].definition
    const selectedValue = testType === 'vi-en' ? option.term : option.definition
    
    setSelectedAnswer(selectedValue)
    const right = selectedValue === correctValue
    setIsCorrect(right)

    if (right) setScore(prev => prev + 1)

    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        setIsFinished(true)
      }
    }, 1200)
  }

  if (cards.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  )

  if (isFinished) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-2xl text-center max-w-md w-full border border-slate-200 dark:border-slate-700">
        <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
        <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Hoàn thành!</h2>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl py-6 mb-8 mt-4 border border-slate-100 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-widest mb-1">Điểm của Duy</p>
            <p className="text-5xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">
                {score}<span className="text-slate-300 dark:text-slate-600 text-3xl">/{cards.length}</span>
            </p>
        </div>
        <div className="space-y-3">
            <button onClick={() => window.location.reload()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                <RotateCcw className="w-5 h-5" /> Làm lại bài thi
            </button>
            <button onClick={() => router.back()} className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2">
                Quay lại học phần
            </button>
        </div>
      </motion.div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6 flex flex-col items-center">
      {/* Header & Progress */}
      <div className="w-full max-w-2xl flex flex-col gap-6 mb-10">
        <div className="flex justify-between items-center">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                <ArrowLeft className="w-5 h-5" /> Thoát
            </button>
            <div className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm text-xs font-black text-slate-500 dark:text-slate-400">
                CÂU {currentIndex + 1} / {cards.length}
            </div>
        </div>
        
        <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-slate-700">
          <motion.div 
            className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full" 
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }} 
          />
        </div>
      </div>

      <main className="w-full max-w-2xl">
        {/* Câu hỏi Card */}
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-12 shadow-xl border border-slate-100 dark:border-slate-700 mb-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600"></div>
            <span className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-[0.2em] bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">
                Đâu là đáp án đúng?
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mt-8 mb-2 leading-tight">
                {testType === 'vi-en' ? cards[currentIndex].definition : cards[currentIndex].term}
            </h2>
        </div>

        {/* Danh sách đáp án */}
        <div className="grid grid-cols-1 gap-3">
          {options.map((option, idx) => {
            const optionValue = testType === 'vi-en' ? option.term : option.definition
            const correctValue = testType === 'vi-en' ? cards[currentIndex].term : cards[currentIndex].definition
            
            let buttonStyle = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
            
            if (selectedAnswer === optionValue) {
              buttonStyle = isCorrect 
                ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20" 
                : "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-rose-900/20"
            } else if (selectedAnswer && optionValue === correctValue) {
              buttonStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-400"
            }

            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(option)}
                className={`w-full p-6 rounded-2xl border-2 text-left font-bold transition-all flex justify-between items-center ${buttonStyle}`}
              >
                <span className="text-lg">{optionValue}</span>
                {selectedAnswer === optionValue && (
                  <div className="p-1.5 bg-white/20 rounded-full">
                    {isCorrect ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </main>
    </div>
  )
}