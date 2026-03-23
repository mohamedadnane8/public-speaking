import { motion } from "framer-motion";
import type { InterviewQuestion } from "@/types/interview";

interface InterviewQuestionScreenProps {
  question: InterviewQuestion;
  onBegin: () => void;
}

export function InterviewQuestionScreen({
  question,
  onBegin,
}: InterviewQuestionScreenProps) {
  return (
    <motion.div
      key="interview-question"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-[100svh] w-full px-4 pt-[max(env(safe-area-inset-top),5.75rem)] pb-[max(env(safe-area-inset-bottom),2rem)]"
    >
      <div className="mx-auto flex h-full min-h-[calc(100svh-7.75rem)] w-full max-w-[min(100%,36rem)] flex-col items-center justify-center space-y-10">
        {/* Category + difficulty badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3"
        >
          <span
            className="border border-[#1a1a1a]/25 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#1a1a1a]/60"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {question.category}
          </span>
          <span
            className="border border-[#1a1a1a]/25 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#1a1a1a]/60"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {question.difficulty}
          </span>
        </motion.div>

        {/* Question text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center px-2"
        >
          <p
            className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1a1a1a]/90"
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontWeight: 400,
            }}
          >
            {question.question}
          </p>
        </motion.div>

        {/* Timing info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-4"
        >
          <span
            className="text-[10px] tracking-[0.15em] uppercase text-[#1a1a1a]/40"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Think {question.thinkingSeconds}s
          </span>
          <span className="text-[#1a1a1a]/20">|</span>
          <span
            className="text-[10px] tracking-[0.15em] uppercase text-[#1a1a1a]/40"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Answer {question.answeringSeconds}s
          </span>
        </motion.div>

        {/* Begin button */}
        <motion.button
          onClick={onBegin}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.08)" }}
          whileTap={{ scale: 0.98 }}
          className="px-12 py-4 border border-[#1a1a1a]/60 text-[#1a1a1a] text-xs tracking-[0.35em] uppercase transition-all duration-300 hover:border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#FDF6F0]"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          BEGIN
        </motion.button>
      </div>
    </motion.div>
  );
}
