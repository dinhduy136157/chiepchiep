"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { AnimatePresence, motion, PanInfo, useMotionValue, useTransform } from "framer-motion"
import { ArrowLeft, Check, RotateCw, Volume2, X } from "lucide-react"

type Card = {
  id: number
  term: string
  definition: string
}

type ToastState = {
  show: boolean
  message: string
  type: "success" | "info" | "warning"
}

const VOICE_STORAGE_KEY = "flashcards_voice_uri_v2"
const VIETNAMESE_REGEX =
  /[ăâđêôơưáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ]/i

function SwipeCard({
  card,
  flipped,
  onFlip,
  onSwipe,
  isDragging,
  setIsDragging,
}: {
  card: Card
  flipped: boolean
  onFlip: () => void
  onSwipe: (direction: "left" | "right") => void
  isDragging: boolean
  setIsDragging: (value: boolean) => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-8, 8])
  const opacity = useTransform(x, [-280, -160, 0, 160, 280], [0, 1, 1, 1, 0])
  const leftOpacity = useTransform(x, [-120, -40], [1, 0])
  const rightOpacity = useTransform(x, [40, 120], [0, 1])

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)
    const distance = Math.abs(info.offset.x)
    const speed = Math.abs(info.velocity.x)
    x.set(0)

    if (distance < 80 && speed < 450) return
    onSwipe(info.offset.x > 0 ? "right" : "left")
  }

  return (
    <motion.div
      style={{ x, rotate, opacity, touchAction: "pan-y" }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onTap={() => {
        if (!isDragging) onFlip()
      }}
      initial={{ scale: 0.96, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.94, opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        style={{ opacity: leftOpacity }}
        className="absolute top-6 right-5 z-20 rounded-lg border-2 border-rose-500 bg-white/95 px-3 py-1 text-xs font-black text-rose-600 shadow"
      >
        <X className="inline h-3 w-3 mr-1" />
        Học lại
      </motion.div>

      <motion.div
        style={{ opacity: rightOpacity }}
        className="absolute top-6 left-5 z-20 rounded-lg border-2 border-emerald-500 bg-white/95 px-3 py-1 text-xs font-black text-emerald-600 shadow"
      >
        <Check className="inline h-3 w-3 mr-1" />
        Đã biết
      </motion.div>

      <motion.div
        className="relative h-full w-full rounded-[2rem] shadow-xl [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="absolute inset-0 rounded-[2rem] border border-slate-200 bg-white p-6 [backface-visibility:hidden]">
          <div className="mb-5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">
            Thuật ngữ
          </div>
          <div className="flex h-[calc(100%-2rem)] items-center justify-center text-center text-2xl font-black leading-tight text-slate-800 md:text-4xl">
            {card.term}
          </div>
          <div className="absolute bottom-5 left-0 right-0 text-center text-xs text-slate-400">
            Chạm để lật thẻ
          </div>
        </div>

        <div className="absolute inset-0 rounded-[2rem] border border-emerald-400 bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="mb-5 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100">
            Định nghĩa
          </div>
          <div className="flex h-[calc(100%-2rem)] items-center justify-center text-center text-xl font-bold leading-relaxed md:text-3xl">
            {card.definition}
          </div>
          <div className="absolute bottom-5 left-0 right-0 text-center text-xs text-emerald-100/80">
            Vuốt để chuyển thẻ
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function FlashcardsPage() {
  const params = useParams<{ id: string }>()
  const setId = params.id
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [title, setTitle] = useState("")
  const [cards, setCards] = useState<Card[]>([])
  const [mastered, setMastered] = useState<Set<number>>(new Set())
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    type: "info",
  })

  const [voiceOptions, setVoiceOptions] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("")
  const toastTimer = useRef<number | null>(null)

  const stopSpeaking = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  const showToast = useCallback((message: string, type: ToastState["type"]) => {
    setToast({ show: true, message, type })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }))
    }, 1400)
  }, [])

  const pickBestVoice = useCallback((voices: SpeechSynthesisVoice[], langOrder: string[]) => {
    const scoreVoice = (voice: SpeechSynthesisVoice) => {
      const name = voice.name.toLowerCase()
      let score = 0
      if (name.includes("neural")) score += 4
      if (name.includes("google")) score += 3
      if (name.includes("microsoft")) score += 2
      if (voice.localService) score += 1
      if (voice.default) score += 1
      return score
    }

    const byLang = voices.filter((voice) =>
      langOrder.some((prefix) => voice.lang.toLowerCase().startsWith(prefix))
    )
    const pool = byLang.length > 0 ? byLang : voices
    if (pool.length === 0) return null
    return [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0]
  }, [])

  const speakText = useCallback(
    (text: string) => {
      const content = text.trim()
      if (!content) return
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        showToast("Thiết bị chưa hỗ trợ phát âm", "warning")
        return
      }

      const synth = window.speechSynthesis
      synth.cancel()

      const utterance = new SpeechSynthesisUtterance(content)
      utterance.rate = 0.92
      utterance.pitch = 1
      utterance.volume = 1

      const isVietnamese = VIETNAMESE_REGEX.test(content)
      const langOrder = isVietnamese ? ["vi", "en"] : ["en", "vi"]
      const selectedVoice = voiceOptions.find((v) => v.voiceURI === selectedVoiceURI)
      const fallback = pickBestVoice(voiceOptions, langOrder)
      const voice = selectedVoice ?? fallback

      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang
      } else {
        utterance.lang = isVietnamese ? "vi-VN" : "en-US"
      }

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => {
        setIsSpeaking(false)
        showToast("Không thể phát âm từ này", "warning")
      }

      synth.speak(utterance)
    },
    [pickBestVoice, selectedVoiceURI, showToast, voiceOptions]
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [{ data: setRow, error: setRowError }, { data: cardsRows, error: cardsError }, { data: authData }] =
      await Promise.all([
        supabase.from("study_sets").select("title").eq("id", setId).single(),
        supabase.from("cards").select("id, term, definition").eq("set_id", setId).order("id", { ascending: true }),
        supabase.auth.getUser(),
      ])

    if (setRowError) {
      setError(setRowError.message)
      setLoading(false)
      return
    }
    if (cardsError) {
      setError(cardsError.message)
      setLoading(false)
      return
    }

    const currentCards = (cardsRows ?? []) as Card[]
    const currentCardIds = new Set(currentCards.map((card) => card.id))

    setTitle(setRow?.title ?? "")
    setCards(currentCards)

    if (authData.user) {
      const { data: progressRows } = await supabase
        .from("learning_progress")
        .select("card_id")
        .eq("user_id", authData.user.id)
        .eq("status", "mastered")

      if (progressRows) {
        setMastered(
          new Set(
            progressRows
              .map((row) => row.card_id)
              .filter((cardId) => currentCardIds.has(cardId))
          )
        )
      }
    }

    setLoading(false)
  }, [setId, supabase])

  useEffect(() => {
    void Promise.resolve().then(loadData)
  }, [loadData])

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return

    const synth = window.speechSynthesis
    const loadVoices = () => {
      const voices = synth.getVoices()
      const filtered = voices.filter((voice) => {
        const lang = voice.lang.toLowerCase()
        return lang.startsWith("vi") || lang.startsWith("en")
      })
      const usable = filtered.length > 0 ? filtered : voices
      setVoiceOptions(usable)

      if (usable.length === 0) return
      setSelectedVoiceURI((current) => {
        if (current && usable.some((v) => v.voiceURI === current)) return current
        const stored = window.localStorage.getItem(VOICE_STORAGE_KEY)
        if (stored && usable.some((v) => v.voiceURI === stored)) return stored
        const preferred = pickBestVoice(usable, ["vi", "en"])
        return preferred?.voiceURI ?? usable[0].voiceURI
      })
    }

    loadVoices()
    synth.addEventListener("voiceschanged", loadVoices)
    return () => synth.removeEventListener("voiceschanged", loadVoices)
  }, [pickBestVoice])

  useEffect(() => {
    if (typeof window === "undefined" || !selectedVoiceURI) return
    window.localStorage.setItem(VOICE_STORAGE_KEY, selectedVoiceURI)
  }, [selectedVoiceURI])

  useEffect(() => {
    return () => {
      stopSpeaking()
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [stopSpeaking])

  const unmasteredCards = useMemo(
    () => cards.filter((card) => !mastered.has(card.id)),
    [cards, mastered]
  )

  const nextCard = useCallback(() => {
    if (unmasteredCards.length === 0) return
    stopSpeaking()
    setIndex((prev) => (Math.min(prev, unmasteredCards.length - 1) + 1) % unmasteredCards.length)
    setFlipped(false)
  }, [stopSpeaking, unmasteredCards.length])

  const prevCard = useCallback(() => {
    if (unmasteredCards.length === 0) return
    stopSpeaking()
    setIndex(
      (prev) => (Math.min(prev, unmasteredCards.length - 1) - 1 + unmasteredCards.length) % unmasteredCards.length
    )
    setFlipped(false)
  }, [stopSpeaking, unmasteredCards.length])

  const markMastered = useCallback(
    async (cardId: number) => {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const isMastered = mastered.has(cardId)
      const next = new Set(mastered)
      if (isMastered) {
        next.delete(cardId)
        showToast("Đã bỏ đánh dấu thuộc bài", "info")
      } else {
        next.add(cardId)
        showToast("Đã đánh dấu thuộc bài", "success")
      }
      setMastered(next)

      await supabase.from("learning_progress").upsert(
        {
          user_id: authData.user.id,
          card_id: cardId,
          status: isMastered ? "learning" : "mastered",
          last_reviewed: new Date().toISOString(),
        },
        { onConflict: "user_id,card_id" }
      )
    },
    [mastered, showToast, supabase]
  )

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      const currentIndex = Math.min(index, unmasteredCards.length - 1)
      const current = unmasteredCards[currentIndex]
      if (!current) return

      if (direction === "right") {
        void markMastered(current.id)
        showToast("Tốt lắm, bạn đã thuộc thẻ này", "success")
        return
      } else {
        showToast("Sẽ ôn lại thẻ này sau", "info")
      }
      nextCard()
    },
    [index, markMastered, nextCard, showToast, unmasteredCards]
  )

  const handleFlip = useCallback(() => {
    if (isDragging) return
    stopSpeaking()
    setFlipped((prev) => !prev)
  }, [isDragging, stopSpeaking])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center text-slate-500 dark:text-slate-400">
        Đang tải dữ liệu...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 p-6 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => router.push(`/dashboard/set/${setId}`)}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            Quay lại bộ thẻ
          </button>
        </div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Bộ thẻ này chưa có nội dung.</p>
          <button
            onClick={() => router.push(`/dashboard/set/${setId}`)}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            Quay lại bộ thẻ
          </button>
        </div>
      </div>
    )
  }

  const masteredPercent = Math.round((mastered.size / cards.length) * 100)
  const remainingCount = unmasteredCards.length
  const currentIndex = remainingCount === 0 ? 0 : Math.min(index, remainingCount - 1)
  const current = unmasteredCards[currentIndex]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] pb-8">
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
        <div className="mx-auto w-full max-w-4xl px-4 md:px-6">
          <div className="h-14 flex items-center justify-between">
            <button
              onClick={() => router.push(`/dashboard/set/${setId}`)}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <p className="max-w-[58%] truncate text-sm md:text-base font-bold text-slate-800 dark:text-white">
              {title || "Flashcards"}
            </p>

            <button
              onClick={() => {
                if (remainingCount === 0) return
                setIndex(Math.floor(Math.random() * remainingCount))
                setFlipped(false)
                stopSpeaking()
              }}
              disabled={remainingCount === 0}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center disabled:opacity-50"
              aria-label="Xáo trộn"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="pb-3">
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <motion.div
                initial={false}
                animate={{ width: `${masteredPercent}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
              />
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-full px-4 py-2 text-xs font-semibold shadow ${
              toast.type === "success"
                ? "bg-emerald-500 text-white"
                : toast.type === "warning"
                ? "bg-amber-500 text-white"
                : "bg-slate-800 text-white"
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto w-full max-w-4xl px-4 pt-4 md:px-6 md:pt-8">
        {remainingCount === 0 ? (
          <div className="mx-auto flex min-h-[58vh] max-w-md flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Check className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white">
              Bạn đã thuộc hết thẻ trong bộ này.
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Không còn thẻ chưa thuộc để ôn nhanh.
            </p>
            <button
              onClick={() => router.push(`/dashboard/set/${setId}`)}
              className="mt-5 rounded-2xl px-5 py-3 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              Quay lại bộ thẻ
            </button>
          </div>
        ) : (
          <>
        <div className="mb-4 flex items-center justify-between text-sm font-semibold text-slate-500 dark:text-slate-400">
          <span>
            Còn {remainingCount}/{cards.length} thẻ chưa thuộc
          </span>
          <span className="inline-flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            {masteredPercent}% đã thuộc
          </span>
        </div>

        <div className="relative h-[60vh] min-h-[360px] max-h-[620px] [perspective:1200px]">
          <AnimatePresence mode="wait">
            <SwipeCard
              key={current.id}
              card={current}
              flipped={flipped}
              onFlip={handleFlip}
              onSwipe={handleSwipe}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
            />
          </AnimatePresence>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
          <button
            onClick={prevCard}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            ← Trước
          </button>

          <button
            onClick={() => void markMastered(current.id)}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              mastered.has(current.id)
                ? "bg-emerald-500 text-white"
                : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            }`}
          >
            {mastered.has(current.id) ? "Đã thuộc" : "Đánh dấu"}
          </button>

          <button
            onClick={() => speakText(flipped ? current.definition : current.term)}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 border ${
              isSpeaking
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            }`}
            aria-label="Phát âm"
          >
            <Volume2 className="w-4 h-4" />
            {isSpeaking ? "Đang đọc..." : "Phát âm"}
          </button>

          <button
            onClick={nextCard}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Sau →
          </button>
        </div>

        {voiceOptions.length > 0 && (
          <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Giọng đọc:</span>
            <select
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="max-w-[220px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 outline-none"
              aria-label="Chọn giọng đọc"
            >
              {voiceOptions.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="mt-5 text-center text-xs text-slate-400 dark:text-slate-500">
          Vuốt phải để đánh dấu đã thuộc • Vuốt trái để ôn lại sau
        </p>
          </>
        )}
      </main>
    </div>
  )
}
