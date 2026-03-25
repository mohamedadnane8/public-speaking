import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ResumeUpload } from "@/components/ResumeUpload";
import type { ResumeState } from "@/hooks/useInterview";

interface InterviewHomeScreenProps {
  resumeState: ResumeState;
  categories: string[];
  selectedCategory: string | null;
  selectedDifficulty: string | null;
  isFetchingQuestion: boolean;
  isCheckingResume: boolean;
  isRecordingSupported: boolean;
  hasRecordingPermission: boolean | null;
  isRequestingPermission: boolean;
  onFileSelected: (file: File) => void;
  onCategoryChange: (category: string | null) => void;
  onDifficultyChange: (difficulty: string | null) => void;
  onRequestPermission: () => void;
  onStart: () => void;
}

const DIFFICULTY_OPTIONS = [
  { value: null, labelKey: "interview.random" },
  { value: "Easy", labelKey: "interview.easy" },
  { value: "Medium", labelKey: "interview.medium" },
  { value: "Hard", labelKey: "interview.hard" },
];

export function InterviewHomeScreen({
  resumeState,
  categories,
  selectedCategory,
  selectedDifficulty,
  isFetchingQuestion,
  isCheckingResume,
  isRecordingSupported,
  hasRecordingPermission,
  isRequestingPermission,
  onFileSelected,
  onCategoryChange,
  onDifficultyChange,
  onRequestPermission,
  onStart,
}: InterviewHomeScreenProps) {
  const { t } = useTranslation();
  const categoryOptions = [
    { value: null, label: "Random" },
    ...categories.map((c) => ({ value: c, label: c })),
  ];

  const handleCategoryCycle = (direction: 1 | -1 = 1) => {
    const currentIndex = categoryOptions.findIndex(
      (o) => o.value === selectedCategory
    );
    const nextIndex = (currentIndex + direction + categoryOptions.length) % categoryOptions.length;
    onCategoryChange(categoryOptions[nextIndex].value);
  };

  const currentCategoryLabel =
    categoryOptions.find((o) => o.value === selectedCategory)?.label ?? "Random";

  const isBehavioral = selectedCategory === "Behavioral";
  const canStart = (resumeState.isUploaded || isBehavioral) && !resumeState.isParsing && !isFetchingQuestion;

  return (
    <motion.div
      key="interview-home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-[100svh] w-full px-4 pt-16 pb-[max(env(safe-area-inset-bottom),2rem)]"
    >
      <div className="mx-auto flex h-full min-h-[calc(100svh-5rem)] w-full max-w-[min(100%,28rem)] flex-col items-center justify-center space-y-7">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <span
            className="text-3xl sm:text-4xl md:text-5xl uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[#1a1a1a]/75"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {t("interview.title")}
          </span>
          <span
            className="text-3xl sm:text-4xl md:text-5xl uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[#1a1a1a]/75"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {t("interview.training")}
          </span>
        </div>

        {/* Category selector */}
        {categories.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleCategoryCycle(-1)}
                className="p-1 text-[#1a1a1a]/35 hover:text-[#1a1a1a]/70 transition-colors"
                aria-label={t("interview.previousCategory")}
              >
                <svg className="rtl-flip" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span
                className="text-lg tracking-[0.15em] text-[#1a1a1a]/90 min-w-[12rem] text-center"
                style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontWeight: 500,
                }}
              >
                {currentCategoryLabel}
              </span>
              <button
                type="button"
                onClick={() => handleCategoryCycle(1)}
                className="p-1 text-[#1a1a1a]/35 hover:text-[#1a1a1a]/70 transition-colors"
                aria-label={t("interview.nextCategory")}
              >
                <svg className="rtl-flip" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
            <span
              className="text-xs tracking-[0.1em] text-[#1a1a1a]/45"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {t("interview.category")}
            </span>
          </div>
        )}

        {/* Difficulty */}
        <div className="flex items-center gap-2">
          {DIFFICULTY_OPTIONS.map((option) => (
            <button
              key={option.labelKey}
              type="button"
              onClick={() => onDifficultyChange(option.value)}
              className={`border px-3 py-1 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                selectedDifficulty === option.value
                  ? "border-[#1a1a1a]/65 bg-[#1a1a1a]/8 text-[#1a1a1a]"
                  : "border-[#1a1a1a]/20 text-[#1a1a1a]/55 hover:border-[#1a1a1a]/40 hover:text-[#1a1a1a]/75"
              }`}
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>

        {/* Resume upload */}
        <ResumeUpload
          isParsing={resumeState.isParsing}
          parseError={resumeState.parseError}
          uploadedFileName={resumeState.fileName}
          isUploaded={resumeState.isUploaded}
          uploadsUsed={resumeState.uploadsUsed}
          maxUploadsPerWeek={resumeState.maxUploadsPerWeek}
          nextSlotAt={resumeState.nextSlotAt}
          onFileSelected={onFileSelected}
        />

        {/* Decorative dashes */}
        <div
          className="flex items-center justify-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl gap-1.5 sm:gap-4 md:gap-6 lg:gap-8 w-fit max-w-full"
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontWeight: 300,
          }}
        >
          {[...Array(6)].map((_, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="text-[#1a1a1a]/50"
            >
              —
            </motion.span>
          ))}
        </div>

        {/* Status text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-sm tracking-[0.15em] text-[#1a1a1a]/80"
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontWeight: 400,
          }}
        >
          {isBehavioral
            ? t("interview.readyToPractice")
            : resumeState.isUploaded
              ? t("interview.readyToPractice")
              : isCheckingResume
                ? t("interview.checkingResume")
                : t("interview.uploadResume")}
        </motion.p>

        {/* Recording permission request */}
        {isRecordingSupported && hasRecordingPermission !== true && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col items-center gap-3"
          >
            <motion.button
              onClick={onRequestPermission}
              disabled={isRequestingPermission}
              whileHover={{ backgroundColor: "rgba(122, 46, 46, 0.08)" }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3 border border-[#7A2E2E]/60 text-[#7A2E2E] text-xs tracking-[0.25em] uppercase transition-all duration-300 hover:border-[#7A2E2E] hover:bg-[#7A2E2E] hover:text-[#FDF6F0] disabled:opacity-50"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {isRequestingPermission ? t("interview.requesting") : t("interview.enableRecording")}
            </motion.button>
            <span
              className="text-[10px] tracking-[0.1em] text-[#1a1a1a]/40 text-center"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {hasRecordingPermission === false
                ? t("interview.permissionDenied")
                : t("interview.requiredToReview")}
            </span>
          </motion.div>
        )}

        {/* Recording granted indicator */}
        {isRecordingSupported && hasRecordingPermission === true && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-[#2E7A4E]" />
            <span
              className="text-[10px] tracking-[0.15em] uppercase text-[#2E7A4E]/80"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {t("interview.recordingEnabled")}
            </span>
          </motion.div>
        )}

        {/* Start button */}
        <motion.button
          onClick={onStart}
          disabled={
            (!resumeState.isUploaded && selectedCategory !== "Behavioral") ||
            resumeState.isParsing ||
            isFetchingQuestion
          }
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          whileHover={
            canStart
              ? { backgroundColor: "rgba(26, 26, 26, 0.08)" }
              : undefined
          }
          whileTap={canStart ? { scale: 0.98 } : undefined}
          className={`px-12 py-4 border text-xs tracking-[0.35em] uppercase transition-all duration-300 ${
            canStart
              ? "border-[#1a1a1a]/60 text-[#1a1a1a] hover:border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#FDF6F0]"
              : "border-[#1a1a1a]/20 text-[#1a1a1a]/30 cursor-not-allowed"
          }`}
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {isFetchingQuestion ? t("interview.loading") : t("interview.start")}
        </motion.button>

        {/* Feature indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col items-center gap-2"
        >
          {!isRecordingSupported && (
            <span
              className="text-[10px] tracking-[0.1em] text-[#7A2E2E]/70 text-center"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {t("interview.recordingNotAvailable")}
            </span>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
