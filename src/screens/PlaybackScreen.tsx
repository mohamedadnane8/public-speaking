import { motion } from "framer-motion";
import type { ModeConfig } from "@/lib/modes";
import type { SessionAudio } from "@/types/session";

interface PlaybackScreenProps {
  word: string;
  modeConfig: ModeConfig;
  audio: SessionAudio | null | undefined;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onContinue: () => void;
}

export function PlaybackScreen({
  word,
  modeConfig,
  audio,
  isPlaying,
  onPlayToggle,
  onContinue,
}: PlaybackScreenProps) {
  const getErrorMessage = (errorCode?: string) => {
    switch (errorCode) {
      case "MIC_PERMISSION": return "Microphone permission denied";
      case "REC_START_FAIL": return "Failed to start recording";
      case "REC_STOP_FAIL": return "Failed to save recording";
      case "NO_AUDIO": return "No audio captured";
      case "INTERRUPTED": return "Recording interrupted";
      default: return "";
    }
  };

  return (
    <motion.div
      key="playback"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full flex flex-col items-center justify-center px-4"
    >
      <div className="flex flex-col items-center space-y-10 w-full max-w-[min(100%,32rem)]">
        {/* Word */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <span
            className="text-4xl sm:text-5xl md:text-6xl tracking-[0.08em] text-[#1a1a1a]"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
          >
            {word}
          </span>
        </motion.div>

        {/* Mode indicator */}
        <span
          className="text-xs tracking-[0.2em] text-[#1a1a1a]/50 uppercase"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {modeConfig.name}
        </span>

        {/* Playback controls */}
        <div className="flex flex-col items-center gap-6">
          {audio?.available && audio.fileUri ? (
            <motion.button
              onClick={onPlayToggle}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-12 py-4 bg-[#1a1a1a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {isPlaying ? "PAUSE" : "PLAY"}
            </motion.button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span
                className="text-sm text-[#1a1a1a]/50"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                Recording unavailable
              </span>
              {audio?.errorCode && (
                <span
                  className="text-[10px] text-[#1a1a1a]/30"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  {getErrorMessage(audio.errorCode)}
                </span>
              )}
            </div>
          )}

          <motion.button
            onClick={onContinue}
            whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.06)" }}
            whileTap={{ scale: 0.98 }}
            className="text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a]/55 hover:text-[#1a1a1a]/80 transition-colors"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Continue
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
