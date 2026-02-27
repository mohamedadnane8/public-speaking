import { motion } from "framer-motion";
import type { ModeConfig } from "@/lib/modes";

interface HomeScreenProps {
  modeConfig: ModeConfig;
  manualThinkSeconds: number;
  manualSpeakSeconds: number;
  isRecordingSupported: boolean;
  hasRecordingPermission: boolean | null;
  isRequestingPermission: boolean;
  onModeCycle: () => void;
  onManualTimeChange: (type: "think" | "speak", delta: number) => void;
  onRequestPermission: () => void;
  onSpin: () => void;
}

export function HomeScreen({
  modeConfig,
  manualThinkSeconds,
  manualSpeakSeconds,
  isRecordingSupported,
  hasRecordingPermission,
  isRequestingPermission,
  onModeCycle,
  onManualTimeChange,
  onRequestPermission,
  onSpin,
}: HomeScreenProps) {
  const effectiveThinkSeconds = modeConfig.name === "MANUAL" ? manualThinkSeconds : modeConfig.thinkSeconds;
  const effectiveSpeakSeconds = modeConfig.name === "MANUAL" ? manualSpeakSeconds : modeConfig.speakSeconds;

  return (
    <motion.div
      key="home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen w-full flex flex-col items-center justify-center"
    >
      <div className="flex flex-col items-center space-y-10 w-full max-w-[min(100%,28rem)] px-4">
        {/* Mode timing display */}
        <div className="flex flex-col items-center gap-6">
          {/* Think time */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <span
              className="text-3xl sm:text-4xl md:text-5xl uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[#1a1a1a]/75"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              Think
            </span>
            {modeConfig.name === "MANUAL" ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onManualTimeChange("think", -5)}
                  className="w-6 h-6 flex items-center justify-center text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                >
                  −
                </button>
                <span
                  className="text-base sm:text-xl tabular-nums text-[#1a1a1a]/70 min-w-[3rem] text-center"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  {manualThinkSeconds}s
                </span>
                <button
                  type="button"
                  onClick={() => onManualTimeChange("think", 5)}
                  className="w-6 h-6 flex items-center justify-center text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                >
                  +
                </button>
              </div>
            ) : (
              <span
                className="text-base sm:text-xl tabular-nums text-[#1a1a1a]/50"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                {effectiveThinkSeconds}s
              </span>
            )}
          </div>

          {/* Speak time */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <span
              className="text-3xl sm:text-4xl md:text-5xl uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[#1a1a1a]/75"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              Speak
            </span>
            {modeConfig.name === "MANUAL" ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onManualTimeChange("speak", -5)}
                  className="w-6 h-6 flex items-center justify-center text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                >
                  −
                </button>
                <span
                  className="text-base sm:text-xl tabular-nums text-[#1a1a1a]/70 min-w-[3rem] text-center"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  {manualSpeakSeconds}s
                </span>
                <button
                  type="button"
                  onClick={() => onManualTimeChange("speak", 5)}
                  className="w-6 h-6 flex items-center justify-center text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                >
                  +
                </button>
              </div>
            ) : (
              <span
                className="text-base sm:text-xl tabular-nums text-[#1a1a1a]/50"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                {effectiveSpeakSeconds}s
              </span>
            )}
          </div>
        </div>

        {/* Mode selector */}
        <button
          type="button"
          onClick={onModeCycle}
          className="flex flex-col items-center gap-2 group"
        >
          <span
            className="text-lg tracking-[0.15em] text-[#1a1a1a]/90 group-hover:text-[#1a1a1a] transition-colors"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}
          >
            {modeConfig.name}
          </span>
          <span
            className="text-xs tracking-[0.1em] text-[#1a1a1a]/45"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Trains: {modeConfig.descriptor}
          </span>
        </button>

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

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-sm tracking-[0.15em] text-[#1a1a1a]/80"
          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
        >
          Spin the word.
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
              {isRequestingPermission ? "Requesting..." : "Enable Recording"}
            </motion.button>
            <span
              className="text-[10px] tracking-[0.1em] text-[#1a1a1a]/40 text-center"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {hasRecordingPermission === false 
                ? "Permission denied — you can still practice without recording" 
                : "Required to review your practice"}
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
              Recording enabled
            </span>
          </motion.div>
        )}

        <motion.button
          onClick={onSpin}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.08)" }}
          whileTap={{ scale: 0.98 }}
          className="px-12 py-4 border border-[#1a1a1a]/60 text-[#1a1a1a] text-xs tracking-[0.35em] uppercase transition-all duration-300 hover:border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#FDF6F0]"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          SPIN
        </motion.button>

        {/* Recording warning */}
        {!isRecordingSupported && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-[10px] tracking-[0.1em] text-[#7A2E2E]/70 text-center"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Recording not available — use HTTPS or enable microphone permissions
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
