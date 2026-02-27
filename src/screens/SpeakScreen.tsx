import { motion } from "framer-motion";
import { CircularProgress } from "@/components/CircularProgress";
import type { SessionAudio } from "@/types/session";

interface SpeakScreenProps {
  word: string;
  seconds: number;
  totalSeconds: number;
  isRecording: boolean;
  audio: SessionAudio | null | undefined;
}

export function SpeakScreen({ word, seconds, totalSeconds, isRecording, audio }: SpeakScreenProps) {
  const progress = 1 - seconds / totalSeconds;
  const isLowTime = seconds <= 5;

  const recordingLabel = isRecording 
    ? "Recording" 
    : audio?.available === false 
    ? "No recording" 
    : "Starting...";

  return (
    <motion.div
      key="speak"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full flex flex-col items-center justify-center px-4"
    >
      <div className="flex flex-col items-center space-y-8 w-full max-w-[min(100%,32rem)]">
        {/* Phase indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-6"
        >
          <span
            className="text-sm tracking-[0.2em] text-[#1a1a1a]/80"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
          >
            Speak.
          </span>
        </motion.div>

        {/* Word with circular timer and recording indicator inside */}
        <div className="min-h-[320px] sm:min-h-[360px] md:min-h-[400px] w-full flex flex-col items-center justify-center">
          <CircularProgress
            progress={progress}
            seconds={seconds}
            isLowTime={isLowTime}
            size="md"
          >
            <div
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-[0.08em] sm:tracking-[0.12em] text-[#1a1a1a] px-2"
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontWeight: 400,
              }}
            >
              {word}
            </div>
            
            {/* Recording indicator - inside the circle below the word */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 mt-3"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`w-2 h-2 rounded-full ${isRecording ? "bg-[#7A2E2E]" : "bg-[#1a1a1a]/30"}`}
              />
              <span
                className="text-[10px] tracking-[0.2em] uppercase text-[#1a1a1a]/50"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                {recordingLabel}
              </span>
            </motion.div>
          </CircularProgress>
        </div>
      </div>
    </motion.div>
  );
}
