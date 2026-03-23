import { motion } from "framer-motion";
import type { SessionLanguage } from "@/types/session";
import { ResumeUpload } from "@/components/ResumeUpload";
import type { ResumeState } from "@/hooks/useInterview";

const LANGUAGE_OPTIONS: Array<{ value: SessionLanguage; label: string }> = [
  { value: "EN", label: "EN" },
  { value: "FR", label: "FR" },
  { value: "AR", label: "AR" },
];

interface InterviewHomeScreenProps {
  resumeState: ResumeState;
  categories: string[];
  selectedCategory: string | null;
  selectedDifficulty: string | null;
  selectedLanguage: SessionLanguage;
  isFetchingQuestion: boolean;
  isCheckingResume: boolean;
  onFileSelected: (file: File) => void;
  onCategoryChange: (category: string | null) => void;
  onDifficultyChange: (difficulty: string | null) => void;
  onLanguageChange: (language: SessionLanguage) => void;
  onStart: () => void;
}

const DIFFICULTY_OPTIONS = [
  { value: null, label: "Random" },
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
];

export function InterviewHomeScreen({
  resumeState,
  categories,
  selectedCategory,
  selectedDifficulty,
  selectedLanguage,
  isFetchingQuestion,
  isCheckingResume,
  onFileSelected,
  onCategoryChange,
  onDifficultyChange,
  onLanguageChange,
  onStart,
}: InterviewHomeScreenProps) {
  const categoryOptions = [
    { value: null, label: "Random" },
    ...categories.map((c) => ({ value: c, label: c })),
  ];

  // Cycle through categories on click
  const handleCategoryCycle = () => {
    const currentIndex = categoryOptions.findIndex(
      (o) => o.value === selectedCategory
    );
    const nextIndex = (currentIndex + 1) % categoryOptions.length;
    onCategoryChange(categoryOptions[nextIndex].value);
  };

  const currentCategoryLabel =
    categoryOptions.find((o) => o.value === selectedCategory)?.label ?? "Random";

  return (
    <motion.div
      key="interview-home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-[100svh] w-full px-4 pt-[max(env(safe-area-inset-top),5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]"
    >
      <div className="mx-auto flex h-full min-h-[calc(100svh-7rem)] w-full max-w-[min(100%,28rem)] flex-col items-center justify-center space-y-9">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <span
            className="text-3xl sm:text-4xl md:text-5xl uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[#1a1a1a]/75"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Interview
          </span>
          <span
            className="text-3xl sm:text-4xl md:text-5xl uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[#1a1a1a]/75"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Training
          </span>
        </div>

        {/* Category selector */}
        {categories.length > 0 && (
          <button
            type="button"
            onClick={handleCategoryCycle}
            className="flex flex-col items-center gap-2 group"
          >
            <span
              className="text-lg tracking-[0.15em] text-[#1a1a1a]/90 group-hover:text-[#1a1a1a] transition-colors"
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontWeight: 500,
              }}
            >
              {currentCategoryLabel}
            </span>
            <span
              className="text-xs tracking-[0.1em] text-[#1a1a1a]/45"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              Category
            </span>
          </button>
        )}

        {/* Language */}
        <div className="flex items-center gap-2">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onLanguageChange(option.value)}
              className={`min-w-[3rem] border px-3 py-1 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                selectedLanguage === option.value
                  ? "border-[#1a1a1a]/65 bg-[#1a1a1a]/8 text-[#1a1a1a]"
                  : "border-[#1a1a1a]/20 text-[#1a1a1a]/55 hover:border-[#1a1a1a]/40 hover:text-[#1a1a1a]/75"
              }`}
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Difficulty */}
        <div className="flex items-center gap-2">
          {DIFFICULTY_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => onDifficultyChange(option.value)}
              className={`border px-3 py-1 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                selectedDifficulty === option.value
                  ? "border-[#1a1a1a]/65 bg-[#1a1a1a]/8 text-[#1a1a1a]"
                  : "border-[#1a1a1a]/20 text-[#1a1a1a]/55 hover:border-[#1a1a1a]/40 hover:text-[#1a1a1a]/75"
              }`}
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Resume upload */}
        <ResumeUpload
          isParsing={resumeState.isParsing}
          parseError={resumeState.parseError}
          cooldownUntil={resumeState.cooldownUntil}
          uploadedFileName={resumeState.fileName}
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
          {resumeState.isUploaded
            ? "Ready to practice."
            : isCheckingResume
              ? "Checking resume..."
              : "Upload your resume to begin."}
        </motion.p>

        {/* Start button */}
        <motion.button
          onClick={onStart}
          disabled={
            !resumeState.isUploaded ||
            resumeState.isParsing ||
            isFetchingQuestion
          }
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          whileHover={
            resumeState.isUploaded
              ? { backgroundColor: "rgba(26, 26, 26, 0.08)" }
              : undefined
          }
          whileTap={resumeState.isUploaded ? { scale: 0.98 } : undefined}
          className={`px-12 py-4 border text-xs tracking-[0.35em] uppercase transition-all duration-300 ${
            resumeState.isUploaded
              ? "border-[#1a1a1a]/60 text-[#1a1a1a] hover:border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#FDF6F0]"
              : "border-[#1a1a1a]/20 text-[#1a1a1a]/30 cursor-not-allowed"
          }`}
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {isFetchingQuestion ? "Loading..." : "START"}
        </motion.button>
      </div>
    </motion.div>
  );
}
