import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AudioPlayer } from "@/components/AudioPlayer";
import type { SessionAudio } from "@/types/session";

interface InterviewPlaybackScreenProps {
  question: string;
  category: string;
  audio: SessionAudio | null | undefined;
  transcript: string | undefined;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackError?: boolean;
  onPlayToggle: () => void;
  onSeek: (time: number) => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onContinue: () => void;
}

export function InterviewPlaybackScreen({
  question,
  category,
  audio,
  transcript,
  isPlaying,
  currentTime,
  duration,
  playbackError = false,
  onPlayToggle,
  onSeek,
  onSkipBackward,
  onSkipForward,
  onContinue,
}: InterviewPlaybackScreenProps) {
  const { t } = useTranslation();
  const effectiveDuration = duration > 0
    ? duration
    : audio?.durationMs
    ? audio.durationMs / 1000
    : 0;

  const getErrorMessage = (errorCode?: string) => {
    switch (errorCode) {
      case "MIC_PERMISSION": return t("interviewPlayback.errorMicPermission");
      case "REC_START_FAIL": return t("interviewPlayback.errorRecStartFail");
      case "REC_STOP_FAIL": return t("interviewPlayback.errorRecStopFail");
      case "NO_AUDIO": return t("interviewPlayback.errorNoAudio");
      case "INTERRUPTED": return t("interviewPlayback.errorInterrupted");
      default: return "";
    }
  };

  return (
    <motion.div
      key="interview-playback"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full flex flex-col items-center justify-center px-4"
    >
      <div className="flex flex-col items-center space-y-10 w-full max-w-[min(100%,32rem)]">
        {/* Question */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center px-2"
        >
          <p
            dir="auto"
            className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-[#1a1a1a]/90"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
          >
            {question}
          </p>
        </motion.div>

        {/* Category indicator */}
        <span
          className="text-xs tracking-[0.2em] text-[#1a1a1a]/50 uppercase"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {category}
        </span>

        {/* Playback controls */}
        <div className="flex flex-col items-center gap-6 w-full">
          {audio?.available && audio.fileUri && !playbackError ? (
            <AudioPlayer
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={effectiveDuration}
              onPlayToggle={onPlayToggle}
              onSeek={onSeek}
              onSkipBackward={onSkipBackward}
              onSkipForward={onSkipForward}
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span
                className="text-sm text-[#1a1a1a]/50"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                {t("interviewPlayback.recordingUnavailable")}
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
            {t("interviewPlayback.continue")}
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
              {t("interviewPlayback.transcript")}
            </h3>
            <div
              dir="auto"
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
