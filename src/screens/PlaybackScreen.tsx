import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { ModeConfig } from "@/lib/modes";
import type { SessionAudio } from "@/types/session";

interface PlaybackScreenProps {
  word: string;
  modeConfig: ModeConfig;
  audio: SessionAudio | null | undefined;
  transcript: string | undefined;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayToggle: () => void;
  onSeek: (time: number) => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onContinue: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function PlaybackScreen({
  word,
  modeConfig,
  audio,
  transcript,
  isPlaying,
  currentTime,
  duration,
  onPlayToggle,
  onSeek,
  onSkipBackward,
  onSkipForward,
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

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

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
        <div className="flex flex-col items-center gap-6 w-full">
          {audio?.available && audio.fileUri ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 w-full max-w-sm"
            >
              {/* Progress bar with time */}
              <div className="w-full flex items-center gap-3">
                <span
                  className="text-xs text-[#1a1a1a]/50 w-10 text-right"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[progress]}
                  max={100}
                  step={0.1}
                  onValueChange={([value]) => onSeek((value / 100) * duration)}
                  className="flex-1"
                />
                <span
                  className="text-xs text-[#1a1a1a]/50 w-10"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  {formatTime(duration)}
                </span>
              </div>

              {/* Control buttons */}
              <div className="flex items-center gap-6">
                {/* Skip backward 5s */}
                <button
                  type="button"
                  onClick={onSkipBackward}
                  className="p-3 text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5 rounded-full transition-all"
                  aria-label="Skip back 5 seconds"
                >
                  <SkipBack size={20} />
                </button>

                {/* Play/Pause */}
                <button
                  type="button"
                  onClick={onPlayToggle}
                  className="p-4 bg-[#1a1a1a] text-[#FDF6F0] rounded-full hover:bg-[#1a1a1a]/90 transition-all"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
                </button>

                {/* Skip forward 5s */}
                <button
                  type="button"
                  onClick={onSkipForward}
                  className="p-3 text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5 rounded-full transition-all"
                  aria-label="Skip forward 5 seconds"
                >
                  <SkipForward size={20} />
                </button>
              </div>

              {/* Skip labels */}
              <div className="flex items-center gap-12 text-[10px] tracking-[0.1em] uppercase text-[#1a1a1a]/30">
                <span>-5s</span>
                <span>+5s</span>
              </div>
            </motion.div>
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

          <button
            type="button"
            onClick={onContinue}
            className="text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a]/55 hover:text-[#1a1a1a]/80 transition-colors px-4 py-2 hover:bg-[#1a1a1a]/5 rounded cursor-pointer"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Continue
          </button>
        </div>

        {/* Transcript */}
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-md mt-6"
          >
            <h3
              className="text-xs tracking-[0.2em] uppercase text-[#1a1a1a]/60 mb-3 text-center"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              Transcript
            </h3>
            <div
              className="px-4 py-3 bg-[#1a1a1a]/5 border border-[#1a1a1a]/10 text-sm text-[#1a1a1a]/80 max-h-40 overflow-y-auto"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {transcript}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
