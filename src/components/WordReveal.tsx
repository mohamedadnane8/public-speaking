import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import type { SessionLanguage } from "@/types/session";

interface WordRevealProps {
  word: string;
  language: SessionLanguage;
  isRevealing: boolean;
  onRevealComplete?: () => void;
  onLetterSettle?: () => void;
}

const LATIN_CHAR_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ARABIC_CHAR_POOL = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";
const SPIN_INTERVAL_MS = 80;

function randomFromPool(pool: string): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

function scrambleWord(template: string, language: SessionLanguage): string {
  const pool = language === "AR" ? ARABIC_CHAR_POOL : LATIN_CHAR_POOL;

  return Array.from(template)
    .map((char) => {
      if (/\s/.test(char)) return char;
      return randomFromPool(pool);
    })
    .join("");
}

function getLetterSpacing(word: string, language: SessionLanguage): string {
  if (language === "AR") return "normal";

  const charCount = Array.from(word).filter((char) => !/\s/.test(char)).length;
  const wordCount = word.trim().split(/\s+/).filter(Boolean).length || 1;
  const phraseWeight = charCount + Math.max(0, wordCount - 1) * 4;

  if (phraseWeight <= 10) return "0.11em";
  if (phraseWeight <= 18) return "0.08em";
  if (phraseWeight <= 28) return "0.05em";
  return "0.02em";
}

function getFontBounds() {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;

  // Big by default; shrink only when actual rendered text overflows.
  const maxPx = Math.min(172, Math.max(64, Math.floor(viewportWidth * 0.18), Math.floor(viewportHeight * 0.2)));
  const minPx = Math.min(54, Math.max(32, Math.floor(viewportWidth * 0.085)));

  return { maxPx, minPx };
}

function getSettleTickCount(word: string): number {
  const count = Array.from(word).filter((char) => !/\s/.test(char)).length;
  if (count <= 0) return 1;
  return Math.min(8, Math.max(1, Math.ceil(count / 4)));
}

export const WordReveal = ({
  word,
  language,
  isRevealing,
  onRevealComplete,
  onLetterSettle,
}: WordRevealProps) => {
  const [displayWord, setDisplayWord] = useState(word);
  const [isSettled, setIsSettled] = useState(false);
  const [showUnderline, setShowUnderline] = useState(false);
  const [fontSizePx, setFontSizePx] = useState(96);
  const [targetLineCount, setTargetLineCount] = useState<1 | 2>(1);
  const [fitTick, setFitTick] = useState(0);

  const frameRef = useRef<number | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const fitContainerRef = useRef<HTMLDivElement | null>(null);
  const fitMeasureRef = useRef<HTMLSpanElement | null>(null);
  const lastSpinTimeRef = useRef(0);
  const hasShownSpinRef = useRef(false);
  const lineHeight = language === "AR" ? 1.02 : 0.95;
  const letterSpacing = useMemo(
    () => getLetterSpacing(word, language),
    [word, language]
  );
  const canWrapAtSpaces = useMemo(() => /\s/.test(word.trim()), [word]);

  const clearTimers = useCallback(() => {
    for (const id of timeoutRefs.current) {
      window.clearTimeout(id);
    }
    timeoutRefs.current = [];
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    const container = fitContainerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      setFitTick((prev) => prev + 1);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const container = fitContainerRef.current;
    const measurer = fitMeasureRef.current;
    if (!container || !measurer) return;

    const containerWidth = Math.max(1, container.clientWidth);
    const { maxPx, minPx } = getFontBounds();
    const singleLineFloorPx = canWrapAtSpaces ? Math.max(42, minPx - 14) : Math.max(24, minPx - 12);
    const twoLineFloorPx = Math.max(30, minPx - 8);
    let nextSize = maxPx;
    let lines: 1 | 2 = 1;

    measurer.textContent = word;
    measurer.style.width = `${containerWidth}px`;
    measurer.style.letterSpacing = letterSpacing;
    measurer.style.lineHeight = String(lineHeight);

    const setMeasureWrapMode = (wrapAtSpaces: boolean) => {
      measurer.style.whiteSpace = wrapAtSpaces ? "normal" : "nowrap";
      measurer.style.overflowWrap = "normal";
      measurer.style.wordBreak = "normal";
      measurer.style.hyphens = "none";
    };

    const exceedsOneLine = (size: number) => {
      setMeasureWrapMode(false);
      measurer.style.fontSize = `${size}px`;
      const maxHeight = size * lineHeight * 1.18;
      return measurer.scrollWidth > containerWidth + 1 || measurer.scrollHeight > maxHeight;
    };

    const exceedsTwoLines = (size: number) => {
      setMeasureWrapMode(true);
      measurer.style.fontSize = `${size}px`;
      const maxHeight = size * lineHeight * 2 + 1;
      return measurer.scrollHeight > maxHeight || measurer.scrollWidth > containerWidth + 1;
    };

    // Prefer one line whenever possible.
    while (nextSize > singleLineFloorPx && exceedsOneLine(nextSize)) {
      nextSize -= 1;
    }

    if (exceedsOneLine(nextSize)) {
      // If one-line would become too small, allow up to two lines.
      lines = canWrapAtSpaces ? 2 : 1;
      if (canWrapAtSpaces) {
        nextSize = maxPx;
        while (nextSize > twoLineFloorPx && exceedsTwoLines(nextSize)) {
          nextSize -= 1;
        }
      }
    } else {
      lines = 1;
    }

    setFontSizePx(nextSize);
    setTargetLineCount(lines);
  }, [word, language, lineHeight, letterSpacing, fitTick, canWrapAtSpaces]);

  useEffect(() => {
    if (!isRevealing) {
      setDisplayWord(word);
      setIsSettled(false);
      setShowUnderline(false);
      return;
    }

    setIsSettled(false);
    setShowUnderline(false);
    lastSpinTimeRef.current = 0;
    hasShownSpinRef.current = false;
    clearTimers();

    const start = performance.now();
    const spinDuration = 1200;
    const settleDuration = 400;
    const settleEnd = spinDuration + settleDuration;

    const emitSettleTicks = () => {
      const ticks = getSettleTickCount(word);
      for (let i = 0; i < ticks; i += 1) {
        const timerId = window.setTimeout(() => {
          onLetterSettle?.();
        }, i * 60);
        timeoutRefs.current.push(timerId);
      }
    };

    const finalize = () => {
      setDisplayWord(word);
      setIsSettled(true);
      emitSettleTicks();

      timeoutRefs.current.push(
        window.setTimeout(() => setShowUnderline(true), 120)
      );

      timeoutRefs.current.push(
        window.setTimeout(() => {
          onRevealComplete?.();
        }, 560)
      );
    };

    const animate = () => {
      const elapsed = performance.now() - start;

      if (elapsed < spinDuration) {
        if (!hasShownSpinRef.current) {
          hasShownSpinRef.current = true;
          setDisplayWord(scrambleWord(word, language));
        } else if (elapsed - lastSpinTimeRef.current >= SPIN_INTERVAL_MS) {
          lastSpinTimeRef.current = elapsed;
          setDisplayWord(scrambleWord(word, language));
        }
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      if (elapsed < settleEnd) {
        const progress = (elapsed - spinDuration) / settleDuration;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        if (easeOut < 0.72) {
          if (elapsed - lastSpinTimeRef.current >= SPIN_INTERVAL_MS * 0.65) {
            lastSpinTimeRef.current = elapsed;
            setDisplayWord(scrambleWord(word, language));
          }
          frameRef.current = requestAnimationFrame(animate);
          return;
        }
      }

      finalize();
    };

    setDisplayWord(scrambleWord(word, language));
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      clearTimers();
    };
  }, [word, language, isRevealing, onLetterSettle, onRevealComplete, clearTimers]);

  const isArabic = language === "AR";
  const useTwoLines = targetLineCount === 2;

  return (
    <div className="relative w-full">
      <motion.div
        className="mx-auto flex w-full max-w-[min(96vw,60rem)] min-h-[7.5rem] items-center justify-center px-2 sm:min-h-[9.5rem] md:min-h-[11rem]"
        animate={{ scale: showUnderline ? 1.02 : 1 }}
        transition={{ duration: 0.4 }}
      >
        <div ref={fitContainerRef} className="relative w-full">
          <motion.span
            dir={isArabic ? "rtl" : "ltr"}
            className="block w-full select-none overflow-hidden text-center"
            style={{
              fontSize: `${fontSizePx}px`,
              fontFamily: isArabic
                ? '"Amiri", "Noto Naskh Arabic", "Scheherazade New", serif'
                : '"Cormorant Garamond", Georgia, serif',
              fontWeight: isArabic ? (isSettled ? 700 : 600) : isSettled ? 500 : 400,
              letterSpacing,
              lineHeight,
              color: "#1a1a1a",
              unicodeBidi: isArabic ? "isolate" : "normal",
              whiteSpace: useTwoLines ? "normal" : "nowrap",
              overflowWrap: "normal",
              wordBreak: "normal",
              hyphens: "none",
              textWrap: useTwoLines ? "balance" : "nowrap",
              display: useTwoLines ? "-webkit-box" : "block",
              WebkitLineClamp: useTwoLines ? 2 : undefined,
              WebkitBoxOrient: useTwoLines ? "vertical" : undefined,
            }}
            animate={isSettled ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={
              isSettled
                ? { duration: 0.35, times: [0, 0.4, 1], ease: "easeOut" }
                : { duration: 0.15 }
            }
          >
            {displayWord}
          </motion.span>

          <span
            ref={fitMeasureRef}
            aria-hidden="true"
            className="pointer-events-none invisible absolute left-0 top-0 z-[-1] block w-full"
            style={{
              fontFamily: isArabic
                ? '"Amiri", "Noto Naskh Arabic", "Scheherazade New", serif'
                : '"Cormorant Garamond", Georgia, serif',
              fontWeight: isArabic ? 700 : 500,
              letterSpacing,
              lineHeight,
              whiteSpace: canWrapAtSpaces ? "normal" : "nowrap",
              overflowWrap: "normal",
              wordBreak: "normal",
              hyphens: "none",
            }}
          >
            {word}
          </span>
        </div>
      </motion.div>

      <motion.div
        className="absolute -bottom-3 left-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#1a1a1a]/40 to-transparent"
        initial={{ width: 0, x: "-50%" }}
        animate={{
          width: showUnderline ? "70%" : 0,
          x: "-50%",
        }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
};

export default WordReveal;
