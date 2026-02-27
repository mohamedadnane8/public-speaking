import { motion } from "framer-motion";
import { CircularProgress } from "@/components/CircularProgress";

interface ThinkScreenProps {
  word: string;
  seconds: number;
  totalSeconds: number;
  onSkip: () => void;
}

export function ThinkScreen({ word, seconds, totalSeconds, onSkip }: ThinkScreenProps) {
  const progress = 1 - seconds / totalSeconds;
  const isLowTime = seconds <= 5;

  return (
    <motion.div
      key="think"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full flex flex-col items-center justify-center px-4"
    >
      <div className="flex flex-col items-center space-y-10 w-full max-w-[min(100%,32rem)]">
        {/* Phase indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-6"
        >
          <span
            className="text-sm tracking-[0.2em] text-[#1a1a1a]/80"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
          >
            Think.
          </span>
        </motion.div>

        {/* Word with circular timer */}
        <div className="min-h-[320px] sm:min-h-[360px] md:min-h-[400px] w-full flex flex-col items-center justify-center">
          <CircularProgress
            progress={progress}
            seconds={seconds}
            isLowTime={isLowTime}
            size="md"
          >
            <div
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-[0.08em] sm:tracking-[0.12em] text-[#1a1a1a] px-2"
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontWeight: 400,
              }}
            >
              {word}
            </div>
          </CircularProgress>
        </div>

        {/* Skip button */}
        <motion.button
          onClick={onSkip}
          whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.08)" }}
          whileTap={{ scale: 0.98 }}
          className="px-8 py-3 border border-[#1a1a1a]/60 text-[#1a1a1a] text-xs tracking-[0.25em] uppercase transition-all duration-300 hover:border-[#1a1a1a]"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          SPEAK
        </motion.button>
      </div>
    </motion.div>
  );
}
