"use client"
import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, Check, X, RefreshCw, Trophy } from 'lucide-react'
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
  const [testType, setTestType] = useState<'en-vi' | 'vi-en'>('vi-en') // Random kiểu câu hỏi

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

  // Hàm trộn mảng
  const shuffleArray = (array: any[]) => [...array].sort(() => Math.random() - 0.5)

  // Tạo đáp án trắc nghiệm mỗi khi đổi câu hỏi
  useEffect(() => {
    if (cards.length > 0 && currentIndex < cards.length) {
      const currentCard = cards[currentIndex]
      const otherCards = cards.filter(c => c.id !== currentCard.id)
      const distractors = shuffleArray(otherCards).slice(0, 3)
      
      // Random kiểu câu hỏi cho mỗi câu (Tiếng Việt -> Anh hoặc ngược lại)
      setTestType(Math.random() > 0.5 ? 'vi-en' : 'en-vi')
      
      setOptions(shuffleArray([currentCard, ...distractors]))
      setSelectedAnswer(null)
      setIsCorrect(null)
    }
  }, [currentIndex, cards])

  const handleSelect = (option: any) => {
    if (selectedAnswer) return // Không cho chọn lại

    const correctValue = testType === 'vi-en' ? cards[currentIndex].term : cards[currentIndex].definition
    const selectedValue = testType === 'vi-en' ? option.term : option.definition
    
    setSelectedAnswer(selectedValue)
    const right = selectedValue === correctValue
    setIsCorrect(right)

    if (right) setScore(prev => prev + 1)

    // Chuyển câu sau 1.5s
    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        setIsFinished(true)
      }
    }, 1500)
  }

  if (cards.length === 0) return <div className="p-20 text-center font-bold text-emerald-600">Đang khởi tạo bài thi...</div>

  if (isFinished) return (
    <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-md w-full border border-emerald-100">
        <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-6" />
        <h2 className="text-3xl font-black text-slate-800 mb-2">Hoàn thành!</h2>
        <p className="text-slate-500 mb-8 font-medium">Duy đã trả lời đúng <span className="text-emerald-600 font-black">{score}/{cards.length}</span> câu hỏi.</p>
        <button onClick={() => window.location.reload()} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-900 transition-all mb-4">Làm lại bài thi</button>
        <button onClick={() => router.back()} className="w-full py-4 text-slate-400 font-bold hover:underline">Quay lại</button>
      </motion.div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl flex justify-between items-center mb-8">
        <button onClick={() => router.back()} className="text-slate-400 font-bold flex items-center gap-2">← Thoát</button>
        <div className="h-2 flex-1 mx-10 bg-slate-200 rounded-full overflow-hidden">
          <motion.div className="h-full bg-emerald-500" animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }} />
        </div>
        <span className="text-xs font-black text-slate-400">{currentIndex + 1} / {cards.length}</span>
      </div>

      <main className="w-full max-w-2xl">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 mb-8 text-center">
          <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-50 px-3 py-1 rounded-lg">
            {testType === 'vi-en' ? 'Chọn từ tiếng Anh đúng' : 'Nghĩa của từ này là gì?'}
          </span>
          <h2 className="text-3xl font-bold text-slate-800 mt-8 mb-4">
            {testType === 'vi-en' ? cards[currentIndex].definition : cards[currentIndex].term}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {options.map((option, idx) => {
            const optionValue = testType === 'vi-en' ? option.term : option.definition
            const correctValue = testType === 'vi-en' ? cards[currentIndex].term : cards[currentIndex].definition
            
            let buttonStyle = "bg-white border-slate-100 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
            if (selectedAnswer === optionValue) {
              buttonStyle = isCorrect ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100" : "bg-red-500 border-red-500 text-white shadow-lg shadow-red-100"
            } else if (selectedAnswer && optionValue === correctValue) {
              buttonStyle = "bg-emerald-500 border-emerald-500 text-white opacity-80"
            }

            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(option)}
                className={`w-full p-5 rounded-2xl border-2 text-left font-bold transition-all flex justify-between items-center ${buttonStyle}`}
              >
                <span>{optionValue}</span>
                {selectedAnswer === optionValue && (
                  isCorrect ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />
                )}
              </motion.button>
            )
          })}
        </div>
      </main>
    </div>
  )
}