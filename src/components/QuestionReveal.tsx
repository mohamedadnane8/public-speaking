import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface QuestionRevealProps {
  question: string;
  isRevealing: boolean;
  onRevealComplete?: () => void;
  onWordSettle?: () => void;
}

// Pool of filler words used during scramble — visually similar lengths
const FILLER_POOL = [
  "describe", "explain", "develop", "project", "process", "design",
  "improve", "analyze", "manage", "handle", "create", "review",
  "system", "method", "result", "client", "impact", "growth",
  "change", "future", "market", "leader", "define", "report",
  "deploy", "secure", "global", "metric", "custom", "engine",
  "server", "module", "target", "output", "budget", "launch",
];

function randomFiller(targetLength: number): string {
  // Pick a filler word of roughly similar length
  const candidates = FILLER_POOL.filter(
    (w) => Math.abs(w.length - targetLength) <= 3
  );
  const pool = candidates.length > 0 ? candidates : FILLER_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

function scrambleQuestion(words: string[]): string[] {
  return words.map((w) => {
    // Keep punctuation-only tokens as-is
    if (/^[^a-zA-Z0-9À-ÿ]+$/.test(w)) return w;
    // Keep very short words (1-2 chars) as-is
    if (w.length <= 2) return w;
    const filler = randomFiller(w.length);
    // Preserve casing of first char
    if (w[0] === w[0].toUpperCase()) {
      return filler[0].toUpperCase() + filler.slice(1);
    }
    return filler;
  });
}

const SPIN_INTERVAL_MS = 120;

export function QuestionReveal({
  question,
  isRevealing,
  onRevealComplete,
  onWordSettle,
}: QuestionRevealProps) {
  const words = question.split(/(\s+)/); // Split preserving whitespace
  const realWordIndices = words
    .map((w, i) => (/\S/.test(w) ? i : -1))
    .filter((i) => i >= 0);

  const [displayWords, setDisplayWords] = useState<string[]>(words);
  const [settledCount, setSettledCount] = useState(realWordIndices.length);
  const [showUnderline, setShowUnderline] = useState(false);

  const frameRef = useRef<number | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const lastSpinTimeRef = useRef(0);

  const clearTimers = useCallback(() => {
    for (const id of timeoutRefs.current) {
      window.clearTimeout(id);
    }
    timeoutRefs.current = [];
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    if (!isRevealing) {
      setDisplayWords(words);
      setSettledCount(realWordIndices.length);
      setShowUnderline(false);
      return;
    }

    setSettledCount(0);
    setShowUnderline(false);
    lastSpinTimeRef.current = 0;
    clearTimers();

    const start = performance.now();
    const spinDuration = 1000;
    // Settle words in groups — faster for long questions
    const groupSize = Math.max(1, Math.ceil(realWordIndices.length / 8));
    const settleSteps = Math.ceil(realWordIndices.length / groupSize);
    const settleInterval = 100;
    const totalSettleDuration = settleSteps * settleInterval;

    const animate = () => {
      const elapsed = performance.now() - start;

      if (elapsed < spinDuration) {
        // Pure scramble phase
        if (elapsed - lastSpinTimeRef.current >= SPIN_INTERVAL_MS) {
          lastSpinTimeRef.current = elapsed;
          setDisplayWords(scrambleQuestion(words));
        }
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      if (elapsed < spinDuration + totalSettleDuration) {
        // Settle phase: reveal words in groups left-to-right
        const settleElapsed = elapsed - spinDuration;
        const currentStep = Math.min(
          settleSteps,
          Math.floor(settleElapsed / settleInterval) + 1
        );
        const settled = Math.min(realWordIndices.length, currentStep * groupSize);

        setSettledCount(settled);

        // Build display: settled words show real, rest scrambled
        const scrambled = scrambleQuestion(words);
        const merged = words.map((w, i) => {
          const realIdx = realWordIndices.indexOf(i);
          if (realIdx >= 0 && realIdx < settled) return w;
          if (/^\s+$/.test(w)) return w;
          return scrambled[i] ?? w;
        });
        setDisplayWords(merged);

        if (settled < realWordIndices.length) {
          frameRef.current = requestAnimationFrame(animate);
          return;
        }
      }

      // Finalize
      setDisplayWords(words);
      setSettledCount(realWordIndices.length);

      // Emit settle ticks
      const ticks = Math.min(6, Math.ceil(realWordIndices.length / 3));
      for (let i = 0; i < ticks; i++) {
        const id = window.setTimeout(() => onWordSettle?.(), i * 60);
        timeoutRefs.current.push(id);
      }

      const id1 = window.setTimeout(() => setShowUnderline(true), 120);
      timeoutRefs.current.push(id1);

      const id2 = window.setTimeout(() => onRevealComplete?.(), 560);
      timeoutRefs.current.push(id2);
    };

    setDisplayWords(scrambleQuestion(words));
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      clearTimers();
    };
  }, [question, isRevealing, onRevealComplete, onWordSettle, clearTimers]);

  const isFullySettled = settledCount >= realWordIndices.length;

  return (
    <div className="relative w-full">
      <motion.div
        className="mx-auto flex w-full max-w-[min(96vw,40rem)] min-h-[6rem] items-center justify-center px-4 sm:min-h-[8rem]"
        animate={{ scale: showUnderline ? 1.01 : 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.p
          dir="auto"
          className="text-center select-none leading-relaxed"
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontWeight: isFullySettled ? 500 : 400,
            fontSize: "clamp(1.25rem, 3.5vw, 2rem)",
            color: "#1a1a1a",
            letterSpacing: "0.01em",
          }}
          animate={isFullySettled ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={
            isFullySettled
              ? { duration: 0.35, times: [0, 0.4, 1], ease: "easeOut" }
              : { duration: 0.15 }
          }
        >
          {displayWords.map((w, i) => {
            const realIdx = realWordIndices.indexOf(i);
            const isSettled = realIdx >= 0 && realIdx < settledCount;
            const isWhitespace = /^\s+$/.test(w);

            if (isWhitespace) return <span key={i}>{w}</span>;

            return (
              <span
                key={i}
                className="inline-block transition-opacity duration-150"
                style={{
                  opacity: isSettled ? 1 : 0.45,
                }}
              >
                {w}
              </span>
            );
          })}
        </motion.p>
      </motion.div>

      <motion.div
        className="absolute -bottom-2 left-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#1a1a1a]/40 to-transparent"
        initial={{ width: 0, x: "-50%" }}
        animate={{
          width: showUnderline ? "60%" : 0,
          x: "-50%",
        }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
}
