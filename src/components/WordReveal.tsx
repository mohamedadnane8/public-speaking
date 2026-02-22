import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface WordRevealProps {
  word: string;
  isRevealing: boolean;
  onRevealComplete?: () => void;
  onLetterSettle?: () => void;
}

const CHAR_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const getRandomChar = () => CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];

const SPIN_INTERVAL_MS = 80; // Throttle so each letter is visible during spin

const LetterColumn = ({
  targetChar,
  delay,
  isRevealing,
  onSettled,
}: {
  targetChar: string;
  delay: number;
  isRevealing: boolean;
  onSettled: () => void;
}) => {
  const [displayChar, setDisplayChar] = useState('—');
  const [isSettled, setIsSettled] = useState(false);
  const frameRef = useRef<number | null>(null);
  const lastSpinTimeRef = useRef(0);
  const firstLetterShownRef = useRef(false);

  useEffect(() => {
    if (!isRevealing) return;

    lastSpinTimeRef.current = 0;
    firstLetterShownRef.current = false;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const spinDuration = 1200;
      const settleStart = spinDuration + delay;
      const settleDuration = 350;
      const settleEnd = settleStart + settleDuration;

      if (elapsed < spinDuration) {
        // Show a letter on the very first frame so we never stay on "—"
        if (!firstLetterShownRef.current) {
          firstLetterShownRef.current = true;
          setDisplayChar(getRandomChar());
        } else if (elapsed - lastSpinTimeRef.current >= SPIN_INTERVAL_MS) {
          lastSpinTimeRef.current = elapsed;
          setDisplayChar(getRandomChar());
        }
        frameRef.current = requestAnimationFrame(animate);
      } else if (elapsed < settleEnd) {
        const progress = (elapsed - settleStart) / settleDuration;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        if (easeOut < 0.75) {
          if (elapsed - lastSpinTimeRef.current >= SPIN_INTERVAL_MS * 0.6) {
            lastSpinTimeRef.current = elapsed;
            setDisplayChar(getRandomChar());
          }
        } else {
          setDisplayChar(targetChar);
        }
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayChar(targetChar);
        setIsSettled(true);
        onSettled();
      }
    };

    // Show first random letter immediately so spinning is visible from frame one
    setDisplayChar(getRandomChar());
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isRevealing, targetChar, delay, onSettled]);

  return (
    <div className="relative h-[1.1em] min-h-[2rem] w-[0.7em] min-w-[0.5rem] flex items-center justify-center">
      <motion.span
        className="absolute inset-0 flex items-center justify-center select-none"
        style={{
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontWeight: isSettled ? 400 : 300,
          letterSpacing: '0.08em',
          color: '#1a1a1a',
          opacity: 1,
        }}
        animate={isSettled ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={
          isSettled
            ? { duration: 0.35, times: [0, 0.4, 1], ease: 'easeOut' }
            : { duration: 0.15 }
        }
      >
        {displayChar}
      </motion.span>
    </div>
  );
};

export const WordReveal = ({ word, isRevealing, onRevealComplete, onLetterSettle }: WordRevealProps) => {
  const [settledCount, setSettledCount] = useState(0);
  const [showUnderline, setShowUnderline] = useState(false);
  const totalLetters = word.length;

  useEffect(() => {
    if (isRevealing) {
      setSettledCount(0);
      setShowUnderline(false);
    }
  }, [isRevealing, word]);

  useEffect(() => {
    if (settledCount === totalLetters && totalLetters > 0 && isRevealing) {
      setTimeout(() => setShowUnderline(true), 150);
      setTimeout(() => {
        onRevealComplete?.();
      }, 600);
    }
  }, [settledCount, totalLetters, isRevealing, onRevealComplete]);

  const handleSettled = useCallback(() => {
    setSettledCount(prev => prev + 1);
    onLetterSettle?.();
  }, [onLetterSettle]);

  return (
    <div className="relative">
      <motion.div
        className="flex items-center justify-center text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-[0.08em] sm:tracking-[0.12em]"
        animate={{ scale: showUnderline ? 1.02 : 1 }}
        transition={{ duration: 0.4 }}
      >
        {word.split('').map((char, index) => (
          <LetterColumn
            key={`${word}-${index}`}
            targetChar={char.toUpperCase()}
            delay={index * 120}
            isRevealing={isRevealing}
            onSettled={handleSettled}
          />
        ))}
      </motion.div>

      <motion.div
        className="absolute -bottom-3 left-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#1a1a1a]/40 to-transparent"
        initial={{ width: 0, x: '-50%' }}
        animate={{ 
          width: showUnderline ? '70%' : 0,
          x: '-50%'
        }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
};

export default WordReveal;
