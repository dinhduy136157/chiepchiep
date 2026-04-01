"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { ArrowLeft, Check, RotateCw, Volume2, X } from "lucide-react";

type Card = {
  id: number;
  term: string;
  definition: string;
};

const VOICE_STORAGE_KEY = "flashcards_voice_uri_v1";
const VIETNAMESE_REGEX = /[ăâđêôơưáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ]/i;

function SwipeCard({
  card,
  flipped,
  onFlip,
  onSwipe,
  isDragging,
  setIsDragging,
  onDragProgress,
}: {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
  onSwipe: (direction: "left" | "right") => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  onDragProgress?: (offset: number) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-8, 8]);
  const opacity = useTransform(x, [-280, -160, 0, 160, 280], [0, 1, 1, 1, 0]);
  const leftOpacity = useTransform(x, [-120, -40], [1, 0]);
  const rightOpacity = useTransform(x, [40, 120], [0, 1]);
  
  const dragStartX = useRef(0);
  const dragStartTime = useRef(0);

  // Theo dõi quá trình kéo để tạo hiệu ứng
  useEffect(() => {
    const unsubscribe = x.onChange((value) => {
      if (onDragProgress && Math.abs(value) > 30) {
        onDragProgress(value);
      }
    });
    return unsubscribe;
  }, [x, onDragProgress]);

  const handleDragStart = () => {
    setIsDragging(true);
    dragStartX.current = x.get();
    dragStartTime.current = Date.now();
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent, info: PanInfo) => {
    setIsDragging(false);
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const distance = Math.abs(offset);
    const speed = Math.abs(velocity);
    
    // Reset vị trí thẻ
    x.set(0);
    
    // Ngưỡng quẹt: di chuyển > 80px HOẶC tốc độ cao
    const shouldSwipe = distance > 80 || speed > 400;
    
    if (shouldSwipe && distance > 20) {
      if (offset > 0) {
        onSwipe("right");
      } else {
        onSwipe("left");
      }
    }
  };

  return (
    <motion.div
      style={{ x, rotate, opacity, touchAction: "pan-y" }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTap={() => {
        if (!isDragging) {
          onFlip();
        }
      }}
      initial={{ scale: 0.96, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.94, opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        style={{ opacity: leftOpacity }}
        className="absolute top-7 right-6 z-20 rounded-lg border-2 border-rose-500 bg-white/95 px-3 py-1 text-xs font-black text-rose-500 shadow-lg md:text-sm"
      >
        <X className="inline h-3 w-3 mr-1" /> Học lại
      </motion.div>
      
      <motion.div
        style={{ opacity: rightOpacity }}
        className="absolute top-7 left-6 z-20 rounded-lg border-2 border-emerald-500 bg-white/95 px-3 py-1 text-xs font-black text-emerald-600 shadow-lg md:text-sm"
      >
        <Check className="inline h-3 w-3 mr-1" /> Đã biết
      </motion.div>

      <motion.div
        className="relative h-full w-full rounded-[2rem] shadow-xl [transform-style:preserve-3d] md:rounded-[2.5rem]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="absolute inset-0 rounded-[2rem] border border-slate-200 bg-white p-6 [backface-visibility:hidden] md:rounded-[2.5rem] md:p-10">
          <div className="mb-5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">Thuật ngữ</div>
          <div className="flex h-[calc(100%-2rem)] items-center justify-center text-center text-2xl font-black leading-tight text-slate-800 md:text-5xl">
            {card.term}
          </div>
          <div className="absolute bottom-5 left-0 right-0 text-center text-xs text-slate-400">
            👆 Nhấn để lật
          </div>
        </div>
        <div className="absolute inset-0 rounded-[2rem] border border-emerald-400 bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white [backface-visibility:hidden] [transform:rotateY(180deg)] md:rounded-[2.5rem] md:p-10">
          <div className="mb-5 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">Định nghĩa</div>
          <div className="flex h-[calc(100%-2rem)] items-center justify-center text-center text-xl font-bold leading-relaxed md:text-3xl">
            {card.definition}
          </div>
          <div className="absolute bottom-5 left-0 right-0 text-center text-xs text-emerald-200/70">
            👈 👉 Quẹt để chuyển thẻ
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function FlashcardsPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [title, setTitle] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [mastered, setMastered] = useState<Set<number>>(new Set());
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [showToast, setShowToast] = useState<{ show: boolean; message: string; type: string }>({ show: false, message: "", type: "" });
  const [dragProgress, setDragProgress] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceOptions, setVoiceOptions] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  
  const cardRef = useRef<HTMLDivElement>(null);

  // Tạo hiệu ứng rung bằng CSS + Animation (cho cả desktop và mobile)
  const triggerHapticEffect = useCallback((intensity: "light" | "medium" | "heavy") => {
    if (!cardRef.current) return;
    
    const card = cardRef.current;
    card.classList.add("haptic-feedback");
    
    // Cường độ rung khác nhau
    let duration = 0;
    switch (intensity) {
      case "light":
        duration = 60;
        break;
      case "medium":
        duration = 100;
        break;
      case "heavy":
        duration = 150;
        break;
    }
    
    // Animation rung bằng translate X
    card.style.animation = `shake-${intensity} ${duration}ms ease-in-out`;
    
    setTimeout(() => {
      card.classList.remove("haptic-feedback");
      card.style.animation = "";
    }, duration);
    
    // Thử vibrate API nếu có (chỉ trên thiết bị thực)
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      if (intensity === "light") navigator.vibrate(10);
      else if (intensity === "medium") navigator.vibrate(20);
      else navigator.vibrate([30, 15, 30]);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const showTemporaryToast = useCallback((message: string, type: "success" | "info" | "warning") => {
    setShowToast({ show: true, message, type });
    setTimeout(() => {
      setShowToast({ show: false, message: "", type: "" });
    }, 1500);
  }, []);

  const scoreVoice = useCallback((voice: SpeechSynthesisVoice) => {
    const name = voice.name.toLowerCase();
    let score = 0;

    if (name.includes("neural")) score += 4;
    if (name.includes("natural")) score += 3;
    if (name.includes("google")) score += 3;
    if (name.includes("microsoft")) score += 2;
    if (name.includes("online")) score += 2;
    if (name.includes("premium")) score += 1;
    if (voice.localService) score += 1;
    if (voice.default) score += 1;

    return score;
  }, []);

  const pickBestVoice = useCallback(
    (voices: SpeechSynthesisVoice[], langPrefixes: string[]) => {
      const byLang = voices.filter((voice) =>
        langPrefixes.some((prefix) => voice.lang.toLowerCase().startsWith(prefix)),
      );
      const pool = byLang.length > 0 ? byLang : voices;
      if (pool.length === 0) return null;

      return [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
    },
    [scoreVoice],
  );

  const speakText = useCallback((text: string) => {
    const content = text.trim();
    if (!content) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      showTemporaryToast("Thiết bị chưa hỗ trợ phát âm", "warning");
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.volume = 1;
    const isVietnamese = VIETNAMESE_REGEX.test(content);
    const langOrder = isVietnamese ? ["vi", "en"] : ["en", "vi"];
    const selectedVoice = voiceOptions.find((voice) => voice.voiceURI === selectedVoiceURI);
    const fallbackVoice = pickBestVoice(voiceOptions, langOrder);
    const voice = selectedVoice ?? fallbackVoice;

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = isVietnamese ? "vi-VN" : "en-US";
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      showTemporaryToast("Không thể phát âm từ này", "warning");
    };

    synth.speak(utterance);
  }, [pickBestVoice, selectedVoiceURI, showTemporaryToast, voiceOptions]);

  useEffect(() => {
    const load = async () => {
      const [{ data: setData }, { data: cardsData }, { data: authData }] = await Promise.all([
        supabase.from("study_sets").select("title").eq("id", id).single(),
        supabase.from("cards").select("id, term, definition").eq("set_id", id).order("id", { ascending: true }),
        supabase.auth.getUser(),
      ]);

      if (setData?.title) setTitle(setData.title);
      if (cardsData) setCards(cardsData);

      if (authData.user) {
        const { data: progress } = await supabase
          .from("learning_progress")
          .select("card_id")
          .eq("user_id", authData.user.id)
          .eq("status", "mastered");
        if (progress) setMastered(new Set(progress.map((p) => p.card_id)));
      }

      setLoading(false);
    };
    load();
  }, [id, supabase]);

  useEffect(() => {
    return () => stopSpeaking();
  }, [stopSpeaking]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    const loadVoices = () => {
      const voices = synth.getVoices();
      const filtered = voices.filter((voice) => {
        const lang = voice.lang.toLowerCase();
        return lang.startsWith("vi") || lang.startsWith("en");
      });
      const usableVoices = filtered.length > 0 ? filtered : voices;
      setVoiceOptions(usableVoices);

      if (usableVoices.length === 0) return;

      setSelectedVoiceURI((current) => {
        if (current && usableVoices.some((voice) => voice.voiceURI === current)) {
          return current;
        }

        const stored = window.localStorage.getItem(VOICE_STORAGE_KEY);
        if (stored && usableVoices.some((voice) => voice.voiceURI === stored)) {
          return stored;
        }

        const preferred = pickBestVoice(usableVoices, ["vi", "en"]);
        return preferred?.voiceURI ?? usableVoices[0].voiceURI;
      });
    };

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, [pickBestVoice]);

  useEffect(() => {
    if (typeof window === "undefined" || !selectedVoiceURI) return;
    window.localStorage.setItem(VOICE_STORAGE_KEY, selectedVoiceURI);
  }, [selectedVoiceURI]);

  const markMastered = useCallback(
    async (cardId: number) => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const isMastered = mastered.has(cardId);
      const next = new Set(mastered);
      if (isMastered) next.delete(cardId);
      else next.add(cardId);
      setMastered(next);
      
      if (!isMastered) {
        showTemporaryToast("✨ Đã đánh dấu thuộc bài!", "success");
        triggerHapticEffect("medium");
      } else {
        showTemporaryToast("🔄 Bỏ đánh dấu thuộc bài", "info");
        triggerHapticEffect("light");
      }

      await supabase.from("learning_progress").upsert(
        {
          user_id: data.user.id,
          card_id: cardId,
          status: isMastered ? "learning" : "mastered",
          last_reviewed: new Date().toISOString(),
        },
        { onConflict: "user_id, card_id" }
      );
    },
    [mastered, showTemporaryToast, supabase, triggerHapticEffect]
  );

  const nextCard = useCallback(() => {
    if (cards.length === 0) return;
    stopSpeaking();
    setIndex((prev) => (prev + 1) % cards.length);
    setFlipped(false);
    // Hiệu ứng rung nhẹ khi chuyển thẻ
    triggerHapticEffect("light");
  }, [cards.length, stopSpeaking, triggerHapticEffect]);

  const handleSwipe = useCallback((direction: "left" | "right") => {
    const currentCard = cards[index];
    
    // Hiệu ứng rung mạnh khi quẹt thành công
    triggerHapticEffect("heavy");
    
    if (direction === "right") {
      if (!mastered.has(currentCard.id)) {
        markMastered(currentCard.id);
        showTemporaryToast("🎉 Giỏi quá! Đã thuộc bài này", "success");
      } else {
        showTemporaryToast("📚 Bạn đã biết thẻ này rồi!", "info");
      }
    } else {
      showTemporaryToast("🔄 Học lại thẻ này sau", "info");
    }
    
    // Chuyển sang thẻ tiếp theo
    setTimeout(() => {
      nextCard();
    }, 50);
  }, [cards, index, mastered, markMastered, nextCard, showTemporaryToast, triggerHapticEffect]);

  const handleFlip = useCallback(() => {
    if (!isDragging) {
      stopSpeaking();
      setFlipped((prev) => !prev);
      triggerHapticEffect("light");
    }
  }, [isDragging, stopSpeaking, triggerHapticEffect]);

  const handleDragProgress = useCallback((offset: number) => {
    setDragProgress(Math.abs(offset));
    // Rung nhẹ khi kéo đến ngưỡng
    if (Math.abs(offset) > 60 && dragProgress < 60) {
      triggerHapticEffect("light");
    }
  }, [dragProgress, triggerHapticEffect]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Đang tải dữ liệu...</div>;
  }

  if (cards.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-4 text-slate-600">Bộ thẻ này chưa có nội dung.</p>
          <button
            onClick={() => router.push(`/dashboard/set/${id}`)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
          >
            Quay về bộ thẻ
          </button>
        </div>
      </div>
    );
  }

  const current = cards[index];
  const progress = Math.round((mastered.size / cards.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <button
            onClick={() => router.push(`/dashboard/set/${id}`)}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Bộ thẻ
          </button>
          <p className="max-w-[60%] truncate text-sm font-black text-slate-700 md:text-base">{title || "Flashcards"}</p>
          <button
            onClick={() => {
              setIndex(Math.floor(Math.random() * cards.length));
              setFlipped(false);
              triggerHapticEffect("light");
            }}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Xáo trộn"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
        <div className="h-1 bg-slate-100">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 130, damping: 24 }}
          />
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg text-sm font-medium ${
              showToast.type === "success" 
                ? "bg-emerald-500 text-white" 
                : showToast.type === "warning" 
                ? "bg-amber-500 text-white" 
                : "bg-slate-800 text-white"
            }`}
          >
            {showToast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto w-full max-w-5xl px-4 pt-6 md:px-6 md:pt-10">
        <div className="mb-5 flex items-center justify-between px-1 text-sm font-semibold text-slate-500">
          <span>
            Thẻ {index + 1}/{cards.length}
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-500" />
            {progress}% đã thuộc
          </span>
        </div>

        <div ref={cardRef} className="relative h-[62vh] min-h-[380px] max-h-[620px] [perspective:1200px]">
          <AnimatePresence mode="wait">
            <SwipeCard
              key={current.id}
              card={current}
              flipped={flipped}
              onFlip={handleFlip}
              onSwipe={handleSwipe}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              onDragProgress={handleDragProgress}
            />
          </AnimatePresence>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3 md:mt-8 md:gap-4">
          <button
            onClick={() => {
              nextCard();
              triggerHapticEffect("light");
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:border-slate-300 active:scale-95"
          >
            ← Trước
          </button>
          <button
            onClick={() => markMastered(current.id)}
            className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition active:scale-95 ${
              mastered.has(current.id)
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300"
            }`}
          >
            <Check className="h-4 w-4" />
            {mastered.has(current.id) ? "Đã thuộc" : "Đánh dấu"}
          </button>
          <button
            onClick={() => speakText(flipped ? current.definition : current.term)}
            className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold shadow-sm transition active:scale-95 ${
              isSpeaking
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
            }`}
            aria-label="Phát âm"
          >
            <Volume2 className="h-4 w-4" />
            {isSpeaking ? "Đang đọc..." : flipped ? "Đọc nghĩa" : "Đọc từ"}
          </button>
          <button
            onClick={() => {
              nextCard();
              triggerHapticEffect("light");
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:border-slate-300 active:scale-95"
          >
            Sau →
          </button>
        </div>

        {voiceOptions.length > 0 && (
          <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-500">
            <span>Giọng đọc:</span>
            <select
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="max-w-[240px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
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

        <div className="mt-6 text-center text-xs text-slate-400">
          💡 Quẹt phải để đánh dấu đã thuộc • Quẹt trái để học lại
        </div>
      </main>

      <style jsx>{`
        @keyframes shake-light {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-1px); }
          75% { transform: translateX(1px); }
        }
        @keyframes shake-medium {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        @keyframes shake-heavy {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-3px); }
          40% { transform: translateX(3px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
        .haptic-feedback {
          animation-duration: 100ms;
          animation-timing-function: ease-in-out;
        }
      `}</style>
    </div>
  );
}
