import { motion } from "framer-motion";
import type { SessionAudio } from "@/types/session";

interface ScoreSummaryScreenProps {
  overallScore: number;
  audio: SessionAudio | null | undefined;
  onNewSession: () => void;
  onReplay: () => void;
}

export function ScoreSummaryScreen({
  overallScore,
  audio,
  onNewSession,
  onReplay,
}: ScoreSummaryScreenProps) {
  return (
    <motion.div
      key="score-summary"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full flex flex-col items-center justify-center px-4"
    >
      <div className="flex flex-col items-center space-y-12 w-full max-w-[min(100%,32rem)]">
        {/* Score display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <span
            className="text-sm tracking-[0.2em] text-[#1a1a1a]/60"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
          >
            Overall Score
          </span>
          <span
            className="text-7xl sm:text-8xl md:text-9xl tracking-[0.05em] text-[#1a1a1a]"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
          >
            {overallScore.toFixed(1)}
          </span>
          <span
            className="text-xs tracking-[0.15em] text-[#1a1a1a]/40"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            out of 10
          </span>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.button
            onClick={onNewSession}
            whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.92)" }}
            whileTap={{ scale: 0.98 }}
            className="px-12 py-4 bg-[#1a1a1a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            NEW SESSION
          </motion.button>
          
          {audio?.available && audio.fileUri && (
            <motion.button
              onClick={onReplay}
              whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.06)" }}
              whileTap={{ scale: 0.98 }}
              className="text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a]/55 hover:text-[#1a1a1a]/80 transition-colors"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              Replay Recording
            </motion.button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
