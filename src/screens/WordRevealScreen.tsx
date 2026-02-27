import { motion } from "framer-motion";
import { WordReveal } from "@/components/WordReveal";
import type { ModeConfig } from "@/lib/modes";

interface WordRevealScreenProps {
  word: string;
  modeConfig: ModeConfig;
  spinKey: number;
  isRevealing: boolean;
  showActions: boolean;
  onRevealComplete: () => void;
  onLetterSettle: () => void;
  onSpinAgain: () => void;
  onStart: () => void;
}

export function WordRevealScreen({
  word,
  modeConfig,
  spinKey,
  isRevealing,
  showActions,
  onRevealComplete,
  onLetterSettle,
  onSpinAgain,
  onStart,
}: WordRevealScreenProps) {
  return (
    <motion.div
      key="word-reveal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen w-full flex flex-col items-center justify-center px-4"
    >
      <div className="flex flex-col items-center space-y-8 w-full max-w-[min(100%,32rem)]">
        {/* Mode indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ duration: 0.5 }}
          className="h-6"
        >
          <span
            className="text-xs tracking-[0.2em] text-[#1a1a1a]/60 uppercase"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {modeConfig.name}
          </span>
        </motion.div>

        {/* Word reveal */}
        <WordReveal
          key={spinKey}
          word={word}
          isRevealing={isRevealing}
          onRevealComplete={onRevealComplete}
          onLetterSettle={onLetterSettle}
        />

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showActions ? 1 : 0, y: showActions ? 0 : 10 }}
          transition={{ duration: 0.5 }}
          className="pt-8 flex flex-col items-center gap-4"
        >
          <motion.button
            onClick={onStart}
            whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.92)" }}
            whileTap={{ scale: 0.98 }}
            className="px-10 py-4 bg-[#1a1a1a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            START
          </motion.button>
          <motion.button
            onClick={onSpinAgain}
            whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.06)" }}
            whileTap={{ scale: 0.98 }}
            className="text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a]/55 hover:text-[#1a1a1a]/80 transition-colors"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Spin again
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
