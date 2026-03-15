import { motion } from "framer-motion";
import type { SessionAudio } from "@/types/session";
import type { User } from "@/hooks/useAuth";

interface ScoreSummaryScreenProps {
  overallScore: number;
  audio: SessionAudio | null | undefined;
  advice?: string | null;
  isSaving?: boolean;
  isSaved?: boolean;
  isAuthenticated?: boolean;
  user?: User | null;
  onNewSession: () => void;
  onReplay: () => void;
  onSaveAndGetAdvice: () => void;
}

export function ScoreSummaryScreen({
  overallScore,
  audio,
  advice = null,
  isSaving = false,
  isSaved = false,
  isAuthenticated = false,
  user = null,
  onNewSession,
  onReplay,
  onSaveAndGetAdvice,
}: ScoreSummaryScreenProps) {
  const adviceText =
    advice ??
    (isAuthenticated
      ? "Generating your focused advice..."
      : isSaving
      ? "Redirecting to sign in..."
      : "Save this session to get focused advice.");

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

        {(advice || isSaving || isSaved || isAuthenticated) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full max-w-[min(100%,34rem)] border border-[#1a1a1a]/10 bg-[#1a1a1a]/[0.02] px-6 py-5"
          >
            <span
              className="block text-[10px] tracking-[0.18em] uppercase text-[#1a1a1a]/45"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 500 }}
            >
              Advice
            </span>
            <p
              className="mt-2 text-base sm:text-lg leading-tight text-[#1a1a1a]/88"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}
            >
              {adviceText}
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-4"
        >
          {/* Primary: Continue */}
          <motion.button
            onClick={onNewSession}
            whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.92)" }}
            whileTap={{ scale: 0.98 }}
            className="px-12 py-4 bg-[#1a1a1a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Continue
          </motion.button>

          {!isAuthenticated ? (
            <motion.button
              onClick={onSaveAndGetAdvice}
              disabled={isSaving}
              whileHover={isSaving ? {} : { backgroundColor: "rgba(26, 26, 26, 0.06)" }}
              whileTap={isSaving ? {} : { scale: 0.98 }}
              className={`text-[11px] tracking-[0.15em] uppercase transition-colors px-4 py-2 rounded ${
                isSaving
                  ? "text-[#1a1a1a]/30 cursor-wait"
                  : "text-[#1a1a1a]/55 hover:text-[#1a1a1a]/80 hover:bg-[#1a1a1a]/5 cursor-pointer"
              }`}
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {isSaving ? "Redirecting..." : "Save & get advice"}
            </motion.button>
          ) : (
            <span
              className="text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a]/45"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {isSaving ? "Saving session..." : isSaved ? "Session saved automatically" : "Auto-saving session..."}
            </span>
          )}
          
          {/* User info when authenticated */}
          {isAuthenticated && user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 mt-1"
            >
              <span
                className="text-[10px] tracking-[0.1em] text-[#1a1a1a]/40"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                Signed in as {user.firstName} {user.lastName}
              </span>
            </motion.div>
          )}
          
          {audio?.available && audio.fileUri && (
            <motion.button
              onClick={onReplay}
              whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.06)" }}
              whileTap={{ scale: 0.98 }}
              className="text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a]/40 hover:text-[#1a1a1a]/70 transition-colors mt-2"
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
