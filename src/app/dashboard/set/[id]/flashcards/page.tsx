"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowLeft, Check, RotateCw } from "lucide-react";

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
}: {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
  onSwipe: (direction: "left" | "right") => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const opacity = useTransform(x, [-280, -160, 0, 160, 280], [0, 1, 1, 1, 0]);
  const leftOpacity = useTransform(x, [-120, -40], [1, 0]);
  const rightOpacity = useTransform(x, [40, 120], [0, 1]);
  const swipeConfidenceThreshold = 9000;

  return (
    <motion.div
      style={{ x, rotate, opacity, touchAction: "pan-y" }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
      drag="x"
      dragConstraints={{ left: -220, right: 220 }}
      dragElastic={0.35}
      dragMomentum
      whileDrag={{ scale: 0.985 }}
      onTap={onFlip}
      onDragEnd={(_, info) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        const swipePower = Math.abs(offset) * Math.abs(velocity);
        if (offset > 55 || velocity > 260 || (offset > 0 && swipePower > swipeConfidenceThreshold)) onSwipe("right");
        else if (offset < -55 || velocity < -260 || (offset < 0 && swipePower > swipeConfidenceThreshold)) onSwipe("left");
      }}
      initial={{ scale: 0.96, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.94, opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        style={{ opacity: leftOpacity }}
        className="absolute top-7 right-6 z-20 rounded-lg border-2 border-rose-500 bg-white/95 px-3 py-1 text-xs font-black text-rose-500 md:text-sm"
      >
        HOC LAI
      </motion.div>
      <motion.div
        style={{ opacity: rightOpacity }}
        className="absolute top-7 left-6 z-20 rounded-lg border-2 border-emerald-500 bg-white/95 px-3 py-1 text-xs font-black text-emerald-600 md:text-sm"
      >
        DA BIET
      </motion.div>

      <motion.div
        className="relative h-full w-full rounded-[2rem] shadow-xl [transform-style:preserve-3d] md:rounded-[2.5rem]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
      >
        <div className="absolute inset-0 rounded-[2rem] border border-slate-200 bg-white p-6 [backface-visibility:hidden] md:rounded-[2.5rem] md:p-10">
          <div className="mb-5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">Term</div>
          <div className="flex h-[calc(100%-2rem)] items-center justify-center text-center text-2xl font-black leading-tight text-slate-800 md:text-5xl">
            {card.term}
          </div>
        </div>
        <div className="absolute inset-0 rounded-[2rem] border border-emerald-400 bg-emerald-600 p-6 text-white [backface-visibility:hidden] [transform:rotateY(180deg)] md:rounded-[2.5rem] md:p-10">
          <div className="mb-5 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">Definition</div>
          <div className="flex h-[calc(100%-2rem)] items-center justify-center text-center text-xl font-bold leading-relaxed md:text-3xl">
            {card.definition}
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

  const triggerHaptic = useCallback((direction: "left" | "right") => {
    if (typeof window === "undefined") return;
    const supportsTouch =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!supportsTouch || typeof navigator.vibrate !== "function") return;
    // Slightly stronger pulse for right swipe to reinforce "mastered".
    navigator.vibrate(direction === "right" ? [18, 20, 28] : [16]);
  }, []);

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
    [mastered, supabase]
  );

  const nextCard = useCallback(() => {
    if (cards.length === 0) return;
    setIndex((prev) => (prev + 1) % cards.length);
    setFlipped(false);
  }, [cards.length]);

  const prevCard = useCallback(() => {
    if (cards.length === 0) return;
    setIndex((prev) => (prev - 1 + cards.length) % cards.length);
    setFlipped(false);
  }, [cards.length]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Dang tai du lieu...</div>;
  }

  if (cards.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-4 text-slate-600">Bo the nay chua co noi dung.</p>
          <button
            onClick={() => router.push(`/dashboard/set/${id}`)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
          >
            Quay ve bo the
          </button>
        </div>
      </div>
    );
  }

  const current = cards[index];
  const progress = Math.round((mastered.size / cards.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 pb-8">
      <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <button
            onClick={() => router.push(`/dashboard/set/${id}`)}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Bo the
          </button>
          <p className="max-w-[60%] truncate text-sm font-black text-slate-700 md:text-base">{title || "Flashcards"}</p>
          <button
            onClick={() => {
              setIndex(Math.floor(Math.random() * cards.length));
              setFlipped(false);
            }}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Xao tron"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
        <div className="h-1 bg-slate-100">
          <motion.div
            className="h-full bg-emerald-500"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 130, damping: 24 }}
          />
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl px-4 pt-6 md:px-6 md:pt-10">
        <div className="mb-5 flex items-center justify-between px-1 text-sm font-semibold text-slate-500">
          <span>
            The {index + 1}/{cards.length}
          </span>
          <span>{progress}% mastered</span>
        </div>

        <div className="relative h-[62vh] min-h-[380px] max-h-[620px] [perspective:1200px]">
          <AnimatePresence mode="wait">
            <SwipeCard
              key={current.id}
              card={current}
              flipped={flipped}
              onFlip={() => setFlipped((prev) => !prev)}
              onSwipe={(direction) => {
                triggerHaptic(direction);
                if (direction === "right" && !mastered.has(current.id)) markMastered(current.id);
                nextCard();
              }}
            />
          </AnimatePresence>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 md:mt-8 md:gap-4">
          <button
            onClick={prevCard}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:border-slate-300"
          >
            Truoc
          </button>
          <button
            onClick={() => markMastered(current.id)}
            className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
              mastered.has(current.id)
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300"
            }`}
          >
            <Check className="h-4 w-4" />
            {mastered.has(current.id) ? "Da biet" : "Danh dau"}
          </button>
          <button
            onClick={nextCard}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:border-slate-300"
          >
            Sau
          </button>
        </div>
      </main>
    </div>
  );
}
