import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { InterviewQuestion } from "@/types/interview";
import { QuestionReveal } from "@/components/QuestionReveal";

interface InterviewQuestionScreenProps {
  question: InterviewQuestion;
  spinKey: number;
  isRevealing: boolean;
  showActions: boolean;
  onRevealComplete: () => void;
  onWordSettle: () => void;
  onBegin: (thinkSeconds: number, answerSeconds: number) => void;
  onSpinAgain: () => void;
}

export function InterviewQuestionScreen({
  question,
  spinKey,
  isRevealing,
  showActions,
  onRevealComplete,
  onWordSettle,
  onBegin,
  onSpinAgain,
}: InterviewQuestionScreenProps) {
  const { t } = useTranslation();
  const [thinkSeconds, setThinkSeconds] = useState(question.thinkingSeconds);
  const [answerSeconds, setAnswerSeconds] = useState(question.answeringSeconds);

  const handleTimeChange = (type: "think" | "answer", delta: number) => {
    if (type === "think") {
      setThinkSeconds((prev) => Math.max(5, Math.min(300, prev + delta)));
    } else {
      setAnswerSeconds((prev) => Math.max(5, Math.min(300, prev + delta)));
    }
  };

  return (
    <motion.div
      key="interview-question"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen w-full flex flex-col items-center justify-center px-4"
    >
      <div className="flex flex-col items-center space-y-8 w-full max-w-[min(100%,36rem)]">
        {/* Category + difficulty badges */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <span
            className="text-xs tracking-[0.2em] text-[#1a1a1a]/60 uppercase"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {question.category}
          </span>
          <span className="text-[#1a1a1a]/20">·</span>
          <span
            className="text-xs tracking-[0.2em] text-[#1a1a1a]/60 uppercase"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {question.difficulty}
          </span>
        </motion.div>

        {/* Question reveal animation */}
        <QuestionReveal
          key={spinKey}
          question={question.question}
          isRevealing={isRevealing}
          onRevealComplete={onRevealComplete}
          onWordSettle={onWordSettle}
        />

        {/* Actions — shown after reveal completes */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showActions ? 1 : 0, y: showActions ? 0 : 10 }}
          transition={{ duration: 0.5 }}
          className="pt-4 flex flex-col items-center gap-6"
        >
          {/* Adjustable timing controls */}
          <div className="flex flex-col items-center gap-4">
            {/* Think time */}
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <span
                className="text-lg sm:text-xl uppercase tracking-[0.2em] text-[#1a1a1a]/75"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                {t("interviewQuestion.think")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTimeChange("think", -5)}
                  className="w-6 h-6 flex items-center justify-center text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                >
                  −
                </button>
                <span
                  className="text-base tabular-nums text-[#1a1a1a]/70 min-w-[3rem] text-center"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  {thinkSeconds}s
                </span>
                <button
                  type="button"
                  onClick={() => handleTimeChange("think", 5)}
                  className="w-6 h-6 flex items-center justify-center text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Answer time */}
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <span
                className="text-lg sm:text-xl uppercase tracking-[0.2em] text-[#1a1a1a]/75"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                {t("interviewQuestion.answer")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTimeChange("answer", -5)}
                  className="w-6 h-6 flex items-center justify-center text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                >
                  −
                </button>
                <span
                  className="text-base tabular-nums text-[#1a1a1a]/70 min-w-[3rem] text-center"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  {answerSeconds}s
                </span>
                <button
                  type="button"
                  onClick={() => handleTimeChange("answer", 5)}
                  className="w-6 h-6 flex items-center justify-center text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col items-center gap-4">
            <motion.button
              onClick={() => onBegin(thinkSeconds, answerSeconds)}
              whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.92)" }}
              whileTap={{ scale: 0.98 }}
              className="px-10 py-4 bg-[#1a1a1a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {t("interviewQuestion.begin")}
            </motion.button>
            <motion.button
              onClick={onSpinAgain}
              whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.06)" }}
              whileTap={{ scale: 0.98 }}
              className="text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a]/55 hover:text-[#1a1a1a]/80 transition-colors"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {t("interviewQuestion.spinAgain")}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
