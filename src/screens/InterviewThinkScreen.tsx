import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { CircularProgress } from "@/components/CircularProgress";

interface InterviewThinkScreenProps {
  question: string;
  seconds: number;
  totalSeconds: number;
  onSkip: () => void;
}

export function InterviewThinkScreen({
  question,
  seconds,
  totalSeconds,
  onSkip,
}: InterviewThinkScreenProps) {
  const { t } = useTranslation();
  const progress = 1 - seconds / totalSeconds;
  const isLowTime = seconds <= 5;

  return (
    <motion.div
      key="interview-think"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-[100svh] w-full px-4 pt-16 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
    >
      <div className="mx-auto flex h-full min-h-[calc(100svh-5.5rem)] w-full max-w-[min(100%,32rem)] flex-col items-center justify-center space-y-8 sm:space-y-10">
        {/* Phase indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-6"
        >
          <span
            className="text-sm tracking-[0.2em] text-[#1a1a1a]/80"
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontWeight: 400,
            }}
          >
            {t("interviewThink.title")}
          </span>
        </motion.div>

        {/* Question with circular timer */}
        <div className="min-h-[280px] sm:min-h-[360px] md:min-h-[400px] w-full flex flex-col items-center justify-center">
          <CircularProgress
            progress={progress}
            seconds={seconds}
            isLowTime={isLowTime}
            size="md"
          >
            <div
              dir="auto"
              className="text-base sm:text-lg md:text-xl leading-relaxed tracking-[0.02em] text-[#1a1a1a] px-6 text-center max-w-[16rem] sm:max-w-[18rem]"
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontWeight: 400,
              }}
            >
              {question}
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
          {t("interviewThink.answer")}
        </motion.button>
      </div>
    </motion.div>
  );
}
