import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

interface ResumeUploadProps {
  isParsing: boolean;
  parseError: string | null;
  cooldownUntil: string | null;
  uploadedFileName: string | null;
  onFileSelected: (file: File) => void;
}

function formatCooldownRemaining(cooldownUntil: string): string {
  const remaining = new Date(cooldownUntil).getTime() - Date.now();
  if (remaining <= 0) return "";
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function ResumeUpload({
  isParsing,
  parseError,
  cooldownUntil,
  uploadedFileName,
  onFileSelected,
}: ResumeUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [cooldownText, setCooldownText] = useState("");

  // Live cooldown countdown
  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownText("");
      return;
    }

    const update = () => {
      const text = formatCooldownRemaining(cooldownUntil);
      setCooldownText(text);
    };

    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const validateAndSubmit = useCallback(
    (file: File) => {
      setValidationError(null);

      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setValidationError("Only PDF and Word (.docx) files are accepted.");
        return;
      }

      if (!ACCEPTED_TYPES.includes(file.type) && file.type !== "") {
        setValidationError("Invalid file type. Please upload a PDF or Word document.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setValidationError("File is too large. Maximum size is 10 MB.");
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
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [validateAndSubmit]
  );

  const isCoolingDown = cooldownUntil && new Date(cooldownUntil).getTime() > Date.now();
  const displayError = validationError || parseError;

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {uploadedFileName && !isParsing && (
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[#2E7A4E]">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span
            className="text-[11px] tracking-[0.1em] text-[#1a1a1a]/60"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {uploadedFileName}
          </span>
        </div>
      )}

      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isParsing && !isCoolingDown && fileInputRef.current?.click()}
        className={`w-full max-w-[20rem] border border-dashed px-6 py-5 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
          isDragging
            ? "border-[#1a1a1a]/60 bg-[#1a1a1a]/5"
            : isParsing || isCoolingDown
              ? "border-[#1a1a1a]/15 cursor-wait"
              : "border-[#1a1a1a]/25 hover:border-[#1a1a1a]/45"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleInputChange}
          className="hidden"
        />

        {isParsing ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-[#1a1a1a]/20 border-t-[#1a1a1a]/60 rounded-full"
            />
            <span
              className="text-[10px] tracking-[0.15em] uppercase text-[#1a1a1a]/50"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              Analyzing resume...
            </span>
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#1a1a1a]/40">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <span
              className="text-[10px] tracking-[0.12em] uppercase text-[#1a1a1a]/50 text-center"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {uploadedFileName ? "Upload new resume" : "Drop resume here"}
            </span>
            <span
              className="text-[9px] tracking-[0.08em] text-[#1a1a1a]/30"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              PDF or Word — max 10 MB
            </span>
          </>
        )}
      </motion.div>

      {isCoolingDown && cooldownText && (
        <span
          className="text-[10px] tracking-[0.1em] text-[#7A2E2E]/70 text-center"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          Next upload available in {cooldownText}
        </span>
      )}

      {displayError && !isCoolingDown && (
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
