"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { ArrowLeft, Check, RotateCw, X } from "lucide-react";

type Card = {
  id: number;
  term: string;
  definition: string;
};

function SwipeCard({
  card,
  flipped,
  onFlip,
  onSwipe,
  isDragging,
  setIsDragging,
}: {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
  onSwipe: (direction: "left" | "right") => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-8, 8]);
  const opacity = useTransform(x, [-280, -160, 0, 160, 280], [0, 1, 1, 1, 0]);
  const leftOpacity = useTransform(x, [-120, -40], [1, 0]);
  const rightOpacity = useTransform(x, [40, 120], [0, 1]);
  
  const dragStartX = useRef(0);
  const dragStartTime = useRef(0);

  const handleDragStart = () => {
    setIsDragging(true);
    dragStartX.current = x.get();
    dragStartTime.current = Date.now();
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent, info: PanInfo) => {
    setIsDragging(false);
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const timeDiff = Date.now() - dragStartTime.current;
    const distance = Math.abs(offset);
    const speed = Math.abs(velocity);
    
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
        // Chỉ lật thẻ khi không đang kéo
        if (!isDragging) {
          onFlip();
        }
      }}
      initial={{ scale: 0.96, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.94, opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {/* Left swipe indicator */}
      <motion.div
        style={{ opacity: leftOpacity }}
        className="absolute top-7 right-6 z-20 rounded-lg border-2 border-rose-500 bg-white/95 px-3 py-1 text-xs font-black text-rose-500 shadow-lg md:text-sm"
      >
        <X className="inline h-3 w-3 mr-1" /> Học lại
      </motion.div>
      
      {/* Right swipe indicator */}
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
        {/* Front - Term */}
        <div className="absolute inset-0 rounded-[2rem] border border-slate-200 bg-white p-6 [backface-visibility:hidden] md:rounded-[2.5rem] md:p-10">
          <div className="mb-5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">Thuật ngữ</div>
          <div className="flex h-[calc(100%-2rem)] items-center justify-center text-center text-2xl font-black leading-tight text-slate-800 md:text-5xl">
            {card.term}
          </div>
          <div className="absolute bottom-5 left-0 right-0 text-center text-xs text-slate-400">
            👆 Nhấn để lật
          </div>
        </div>
        
        {/* Back - Definition */}
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

  // Hiệu ứng rung trên điện thoại
  const triggerHaptic = useCallback((type: "left" | "right" | "flip") => {
    if (typeof window === "undefined") return;
    
    // Kiểm tra hỗ trợ rung
    const supportsVibrate = "vibrate" in navigator;
    if (!supportsVibrate) return;
    
    // Chỉ rung trên thiết bị cảm ứng
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;
    
    // Các pattern rung khác nhau cho từng hành động
    switch (type) {
      case "right":
        // Rung ngắn + nhẹ khi đánh dấu đã biết
        navigator.vibrate([12, 30, 12]);
        break;
      case "left":
        // Rung ngắn khi học lại
        navigator.vibrate([20]);
        break;
      case "flip":
        // Rung rất nhẹ khi lật thẻ
        navigator.vibrate(8);
        break;
      default:
        break;
    }
  }, []);

  // Hiển thị toast thông báo
  const showTemporaryToast = (message: string, type: "success" | "info" | "warning") => {
    setShowToast({ show: true, message, type });
    setTimeout(() => {
      setShowToast({ show: false, message: "", type: "" });
    }, 1500);
  };

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

  const markMastered = useCallback(
    async (cardId: number) => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const isMastered = mastered.has(cardId);
      const next = new Set(mastered);
      if (isMastered) next.delete(cardId);
      else next.add(cardId);
      setMastered(next);
      
      // Hiển thị toast và rung
      if (!isMastered) {
        showTemporaryToast("✨ Đã đánh dấu thuộc bài!", "success");
        triggerHaptic("right");
      } else {
        showTemporaryToast("🔄 Bỏ đánh dấu thuộc bài", "info");
        triggerHaptic("left");
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
    [mastered, supabase, triggerHaptic]
  );

  const nextCard = useCallback(() => {
    if (cards.length === 0) return;
    setIndex((prev) => (prev + 1) % cards.length);
    setFlipped(false);
  }, [cards.length]);

  const handleSwipe = useCallback((direction: "left" | "right") => {
    const currentCard = cards[index];
    
    if (direction === "right") {
      // Quẹt phải = đánh dấu đã biết
      if (!mastered.has(currentCard.id)) {
        markMastered(currentCard.id);
      } else {
        showTemporaryToast("📚 Bạn đã biết thẻ này rồi!", "info");
        triggerHaptic("left");
      }
    } else {
      // Quẹt trái = học lại (không ảnh hưởng đến mastered)
      showTemporaryToast("🔄 Học lại thẻ này sau", "info");
      triggerHaptic("left");
    }
    
    // Chuyển sang thẻ tiếp theo
    nextCard();
  }, [cards, index, mastered, markMastered, nextCard, triggerHaptic]);

  const handleFlip = useCallback(() => {
    if (!isDragging) {
      setFlipped((prev) => !prev);
      triggerHaptic("flip");
    }
  }, [isDragging, triggerHaptic]);

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
              triggerHaptic("flip");
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

        <div className="relative h-[62vh] min-h-[380px] max-h-[620px] [perspective:1200px]">
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

        <div className="mt-6 grid grid-cols-3 gap-3 md:mt-8 md:gap-4">
          <button
            onClick={() => {
              nextCard();
              triggerHaptic("left");
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
            onClick={() => {
              nextCard();
              triggerHaptic("right");
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:border-slate-300 active:scale-95"
          >
            Sau →
          </button>
        </div>

        {/* Hướng dẫn quẹt thẻ cho mobile */}
        <div className="mt-6 text-center text-xs text-slate-400">
          💡 Quẹt phải để đánh dấu đã thuộc • Quẹt trái để học lại
        </div>
      </main>
    </div>
  );
}