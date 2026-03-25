import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

interface ResumeUploadProps {
  isParsing: boolean;
  parseError: string | null;
  uploadedFileName: string | null;
  isUploaded: boolean;
  /** Weekly rate limit info */
  uploadsUsed: number | null;
  maxUploadsPerWeek: number | null;
  nextSlotAt: string | null;
  onFileSelected: (file: File) => void;
}

function formatTimeRemaining(isoTimestamp: string): string {
  const remaining = new Date(isoTimestamp).getTime() - Date.now();
  if (remaining <= 0) return "";
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function ResumeUpload({
  isParsing,
  parseError,
  uploadedFileName,
  isUploaded,
  uploadsUsed,
  maxUploadsPerWeek,
  nextSlotAt,
  onFileSelected,
}: ResumeUploadProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [nextSlotText, setNextSlotText] = useState("");

  useEffect(() => {
    if (!nextSlotAt) {
      setNextSlotText("");
      return;
    }
    const update = () => setNextSlotText(formatTimeRemaining(nextSlotAt));
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [nextSlotAt]);

  const validateAndSubmit = useCallback(
    (file: File) => {
      setValidationError(null);
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setValidationError(t("resume.invalidFileType"));
        return;
      }
      if (!ACCEPTED_TYPES.includes(file.type) && file.type !== "") {
        setValidationError(t("resume.invalidFileTypeToast"));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setValidationError(t("resume.fileTooLarge"));
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSubmit(file);
    },
    [validateAndSubmit]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSubmit(file);
      e.target.value = "";
    },
    [validateAndSubmit]
  );

  const isRateLimited = !!(nextSlotAt && new Date(nextSlotAt).getTime() > Date.now());

  const triggerFileInput = useCallback(() => {
    if (!isParsing && !isRateLimited) fileInputRef.current?.click();
  }, [isParsing, isRateLimited]);

  const displayError = validationError || parseError;
  const hasResume = (isUploaded || !!uploadedFileName) && !isParsing;

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={handleInputChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {isParsing ? (
          /* Parsing state — compact spinner */
          <motion.div
            key="parsing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 py-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-[#1a1a1a]/20 border-t-[#1a1a1a]/60 rounded-full"
            />
            <span
              className="text-[10px] tracking-[0.15em] uppercase text-[#1a1a1a]/50"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {t("resume.analyzing")}
            </span>
          </motion.div>
        ) : hasResume ? (
          /* Compact mode — resume already uploaded */
          <motion.div
            key="compact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#2E7A4E] flex-shrink-0">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span
              className="text-[11px] tracking-[0.08em] text-[#1a1a1a]/55 truncate max-w-[10rem]"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {uploadedFileName ?? t("resume.uploaded")}
            </span>
            <button
              type="button"
              onClick={triggerFileInput}
              className="text-[10px] tracking-[0.1em] uppercase text-[#1a1a1a]/40 hover:text-[#1a1a1a]/70 transition-colors underline underline-offset-2"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {t("resume.replace")}
            </button>
          </motion.div>
        ) : (
          /* Full drop zone — no resume yet */
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`w-full max-w-[20rem] border border-dashed px-6 py-5 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
              isDragging
                ? "border-[#1a1a1a]/60 bg-[#1a1a1a]/5"
                : "border-[#1a1a1a]/25 hover:border-[#1a1a1a]/45"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#1a1a1a]/40">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <span
              className="text-[10px] tracking-[0.12em] uppercase text-[#1a1a1a]/50 text-center"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {t("resume.dropHere")}
            </span>
            <span
              className="text-[9px] tracking-[0.08em] text-[#1a1a1a]/30"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {t("resume.pdfOrWord")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {uploadsUsed !== null && maxUploadsPerWeek !== null && (
        <span
          className="text-[9px] tracking-[0.08em] text-[#1a1a1a]/35"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {t("resume.uploadsThisWeek", { used: uploadsUsed, max: maxUploadsPerWeek })}
        </span>
      )}

      {isRateLimited && nextSlotText && (
        <span
          className="text-[10px] tracking-[0.1em] text-[#7A2E2E]/70 text-center"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {t("resume.weeklyLimitReached", { time: nextSlotText })}
        </span>
      )}

      {displayError && !isRateLimited && (
        <span
          className="text-[10px] tracking-[0.1em] text-[#7A2E2E]/70 text-center max-w-[20rem]"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {displayError}
        </span>
      )}
    </div>
  );
}
