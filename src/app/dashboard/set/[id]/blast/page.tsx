"use client"
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Target, 
  Trophy, 
  Zap, 
  Heart, 
  Crosshair,
  Bomb,
  Skull,
  Sparkles,
  Timer,
  RefreshCw
} from 'lucide-react'

interface Bullet {
  id: number
  x: number
  y: number
}

interface Enemy {
  id: number
  term: string
  definition: string
  x: number
  y: number
  speed: number
  hp: number
  maxHp: number
  type: 'normal' | 'fast' | 'tank'
}

export default function BlastGame() {
  const { id } = useParams()
  const supabase = createClient()
  const router = useRouter()
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [bullets, setBullets] = useState<Bullet[]>([])
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(5)
  const [gameState, setGameState] = useState<'start' | 'playing' | 'over' | 'victory'>('start')
  const [currentTarget, setCurrentTarget] = useState<any>(null)
  const [cards, setCards] = useState<any[]>([])
  const [wave, setWave] = useState(1)
  const [enemiesKilled, setEnemiesKilled] = useState(0)
  const [combo, setCombo] = useState(0)
  const [comboTimer, setComboTimer] = useState<NodeJS.Timeout | null>(null)

  // Fetch dữ liệu
  useEffect(() => {
    const fetchCards = async () => {
      const { data } = await supabase.from('cards').select('*').eq('set_id', id)
      if (data && data.length >= 4) {
        setCards(data)
        // Chọn mục tiêu hiện tại
        setCurrentTarget(data[Math.floor(Math.random() * data.length)])
      } else {
        alert("Cần ít nhất 4 từ để chơi game!")
        router.back()
      }
    }
    fetchCards()
  }, [id, supabase, router])

  // Xử lý di chuyển chuột
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (gameAreaRef.current) {
        const rect = gameAreaRef.current.getBoundingClientRect()
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        })
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Bắn đạn
  useEffect(() => {
    const handleClick = () => {
      if (gameState !== 'playing') return
      
      // Tạo đạn mới
      const newBullet: Bullet = {
        id: Date.now(),
        x: mousePos.x,
        y: mousePos.y
      }
      setBullets(prev => [...prev, newBullet])

      // Kiểm tra va chạm
      enemies.forEach(enemy => {
        const distance = Math.sqrt(
          Math.pow(mousePos.x - enemy.x, 2) + 
          Math.pow(mousePos.y - enemy.y, 2)
        )
        
        // Nếu bắn trúng enemy
        if (distance < 50) {
          handleHit(enemy)
        }
      })

      // Xóa đạn sau 100ms
      setTimeout(() => {
        setBullets(prev => prev.filter(b => b.id !== newBullet.id))
      }, 100)
    }

    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [mousePos, enemies, gameState])

  // Sinh enemy mới
  useEffect(() => {
    if (gameState !== 'playing' || !currentTarget) return

    const spawnEnemy = () => {
      const randomCard = cards[Math.floor(Math.random() * cards.length)]
      const isCorrect = randomCard.id === currentTarget.id
      
      // Xác định loại enemy dựa trên wave
      const rand = Math.random()
      let type: 'normal' | 'fast' | 'tank' = 'normal'
      let speed = 1 + (wave * 0.2)
      let hp = 1
      let maxHp = 1

      if (wave > 3) {
        if (rand < 0.2) {
          type = 'tank'
          speed = 0.5
          hp = 3
          maxHp = 3
        } else if (rand < 0.4) {
          type = 'fast'
          speed = 2.5
          hp = 1
          maxHp = 1
        }
      }

      const newEnemy: Enemy = {
        id: Date.now() + Math.random(),
        term: randomCard.term,
        definition: randomCard.definition,
        x: Math.random() * (gameAreaRef.current?.clientWidth || 800),
        y: -50,
        speed: speed,
        hp: hp,
        maxHp: maxHp,
        type: type
      }
      setEnemies(prev => [...prev, newEnemy])
    }

    const interval = setInterval(spawnEnemy, 1000 - (wave * 50)) // Spawn nhanh hơn theo wave
    return () => clearInterval(interval)
  }, [gameState, currentTarget, cards, wave])

  // Di chuyển enemy
  useEffect(() => {
    if (gameState !== 'playing') return

    const moveEnemies = setInterval(() => {
      setEnemies(prev => {
        const moved = prev.map(enemy => ({
          ...enemy,
          y: enemy.y + enemy.speed
        }))

        // Kiểm tra enemy chạm đáy
        const bottomEnemies = moved.filter(e => e.y > (gameAreaRef.current?.clientHeight || 600) - 50)
        if (bottomEnemies.length > 0) {
          setLives(l => {
            const newLives = l - bottomEnemies.length
            if (newLives <= 0) {
              setGameState('over')
            }
            return Math.max(0, newLives)
          })
          return moved.filter(e => e.y <= (gameAreaRef.current?.clientHeight || 600) - 50)
        }

        return moved
      })
    }, 16) // 60fps

    return () => clearInterval(moveEnemies)
  }, [gameState])

  // Xử lý khi bắn trúng
  const handleHit = (enemy: Enemy) => {
    // Giảm HP
    const updatedEnemies = enemies.map(e => {
      if (e.id === enemy.id) {
        const newHp = e.hp - 1
        
        // Nếu enemy chết
        if (newHp <= 0) {
          const isCorrect = enemy.term === currentTarget.term
          
          if (isCorrect) {
            // Bắn trúng mục tiêu đúng
            const points = 100 * wave * (combo + 1)
            setScore(prev => prev + points)
            setCombo(prev => prev + 1)
            setEnemiesKilled(prev => prev + 1)
            
            // Reset combo timer
            if (comboTimer) clearTimeout(comboTimer)
            const timer = setTimeout(() => setCombo(0), 3000)
            setComboTimer(timer)

            // Đổi mục tiêu mới
            const newTarget = cards[Math.floor(Math.random() * cards.length)]
            setCurrentTarget(newTarget)

            // Tăng wave sau mỗi 5 enemy đúng
            if (enemiesKilled % 5 === 4) {
              setWave(prev => prev + 1)
            }
          } else {
            // Bắn nhầm enemy
            setScore(prev => Math.max(0, prev - 50))
            setCombo(0)
            setLives(prev => prev - 1)
            if (lives <= 1) setGameState('over')
          }
          
          // Xóa enemy
          return null
        }
        
        // Giảm HP
        return { ...e, hp: newHp }
      }
      return e
    }).filter(Boolean) as Enemy[]

    setEnemies(updatedEnemies)
  }

  // Bắt đầu game
  const startGame = () => {
    setGameState('playing')
    setScore(0)
    setLives(5)
    setWave(1)
    setCombo(0)
    setEnemies([])
    setBullets([])
    setEnemiesKilled(0)
    const newTarget = cards[Math.floor(Math.random() * cards.length)]
    setCurrentTarget(newTarget)
  }

  if (gameState === 'start') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-indigo-900 to-purple-900 p-12 rounded-[3rem] border border-purple-500/30 max-w-md w-full text-center shadow-2xl"
        >
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Crosshair className="w-16 h-16 text-white" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-2 -right-2 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold"
            >
              {cards.length}
            </motion.div>
          </div>
          
          <h1 className="text-5xl font-black text-white mb-4">BLAST</h1>
          <p className="text-purple-200 mb-8">Bắn hạ kẻ địch mang từ vựng đúng!</p>
          
          <div className="space-y-4 mb-8 text-left bg-black/20 p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-white">
              <Target className="w-5 h-5 text-yellow-400" />
              <span>Mục tiêu hiện tại ở góc trái</span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <Crosshair className="w-5 h-5 text-red-400" />
              <span>Click chuột để bắn</span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span>Bắn đúng mục tiêu để nhân combo</span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <Skull className="w-5 h-5 text-red-400" />
              <span>Bắn nhầm hoặc để địch thoát sẽ mất mạng</span>
            </div>
          </div>

          <button 
            onClick={startGame}
            className="w-full py-5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-2xl text-xl hover:from-yellow-500 hover:to-orange-600 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" />
            BẮT ĐẦU CHIẾN ĐẤU
          </button>
        </motion.div>
      </div>
    )
  }

  if (gameState === 'over') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[3rem] p-12 max-w-md w-full text-center"
        >
          <Skull className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h2 className="text-3xl font-black text-slate-800 mb-2">GAME OVER</h2>
          <p className="text-slate-400 mb-4">Wave {wave} • {enemiesKilled} từ đã học</p>
          <div className="text-6xl font-black text-indigo-600 mb-8">{score}</div>
          
          <div className="space-y-3">
            <button 
              onClick={startGame}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
            >
              CHƠI LẠI
            </button>
            <button 
              onClick={() => router.back()}
              className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
            >
              QUAY LẠI
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-slate-900 overflow-hidden relative">
      {/* Game Area */}
      <div 
        ref={gameAreaRef}
        className="relative w-full h-full bg-gradient-to-b from-slate-900 to-slate-800 cursor-none"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)' }}
      >
        {/* HUD */}
        <div className="absolute top-0 left-0 w-full p-6 z-20 pointer-events-none">
          <div className="flex justify-between items-start">
            {/* Target Info */}
            <div className="bg-black/50 backdrop-blur-md border border-yellow-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-400 text-sm font-bold uppercase tracking-wider">Mục tiêu</span>
              </div>
              <div className="text-white">
                <div className="text-2xl font-black">{currentTarget?.term}</div>
                <div className="text-sm text-yellow-200/80">{currentTarget?.definition}</div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4">
              {/* Wave */}
              <div className="bg-black/50 backdrop-blur-md border border-purple-500/30 rounded-2xl p-4 text-center">
                <div className="text-purple-400 text-xs mb-1">WAVE</div>
                <div className="text-3xl font-black text-white">{wave}</div>
              </div>

              {/* Combo */}
              {combo > 0 && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-black/50 backdrop-blur-md border border-yellow-500/30 rounded-2xl p-4 text-center"
                >
                  <div className="text-yellow-400 text-xs mb-1">COMBO</div>
                  <div className="text-3xl font-black text-yellow-400">x{combo}</div>
                </motion.div>
              )}

              {/* Score */}
              <div className="bg-black/50 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-4">
                <div className="text-emerald-400 text-xs mb-1">ĐIỂM</div>
                <div className="text-3xl font-black text-white">{score}</div>
              </div>

              {/* Lives */}
              <div className="bg-black/50 backdrop-blur-md border border-red-500/30 rounded-2xl p-4">
                <div className="text-red-400 text-xs mb-1">MẠNG</div>
                <div className="flex gap-1">
                  {[...Array(lives)].map((_, i) => (
                    <Heart key={i} className="w-6 h-6 text-red-400" fill="currentColor" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enemies */}
        <AnimatePresence>
          {enemies.map(enemy => (
            <motion.div
              key={enemy.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute"
              style={{
                left: enemy.x - 60,
                top: enemy.y - 40
              }}
            >
              <div className={`relative group ${
                enemy.term === currentTarget.term 
                  ? 'border-4 border-yellow-400 shadow-[0_0_20px_rgba(255,255,0,0.5)]' 
                  : 'border border-red-500/50'
              } rounded-xl p-3 bg-black/50 backdrop-blur-sm`}>
                <div className="text-white font-bold text-sm">{enemy.term}</div>
                
                {/* HP Bar cho tank */}
                {enemy.type === 'tank' && (
                  <div className="absolute -bottom-2 left-0 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-red-500"
                      initial={{ width: '100%' }}
                      animate={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                    />
                  </div>
                )}

                {/* Badge loại enemy */}
                {enemy.type === 'fast' && (
                  <div className="absolute -top-2 -right-2">
                    <Zap className="w-4 h-4 text-blue-400" />
                  </div>
                )}
                {enemy.type === 'tank' && (
                  <div className="absolute -top-2 -right-2">
                    <Bomb className="w-4 h-4 text-purple-400" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Bullets */}
        <AnimatePresence>
          {bullets.map(bullet => (
            <motion.div
              key={bullet.id}
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.5, 0] }}
              transition={{ duration: 0.1 }}
              className="absolute w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_20px_rgba(255,255,0,0.8)]"
              style={{
                left: bullet.x - 8,
                top: bullet.y - 8
              }}
            />
          ))}
        </AnimatePresence>

        {/* Custom Cursor */}
        <motion.div 
          className="absolute pointer-events-none z-50"
          style={{
            left: mousePos.x - 15,
            top: mousePos.y - 15
          }}
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity
          }}
        >
          <Crosshair className="w-8 h-8 text-yellow-400" />
        </motion.div>

        {/* Instruction */}
        <div className="absolute bottom-6 left-6 text-white/30 text-sm flex items-center gap-2">
          <span>Click chuột để bắn • Bắn đúng mục tiêu màu vàng</span>
        </div>

        {/* Exit button */}
        <button 
          onClick={() => setGameState('over')}
          className="absolute bottom-6 right-6 text-white/30 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}