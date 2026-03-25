import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Slider } from "@/components/ui/slider";

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface AudioPlayerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayToggle: () => void;
  onSeek: (time: number) => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  compact?: boolean;
}

export function AudioPlayer({
  isPlaying,
  currentTime,
  duration,
  onPlayToggle,
  onSeek,
  onSkipBackward,
  onSkipForward,
  compact = false,
}: AudioPlayerProps) {
  const safeDuration = isFinite(duration) && duration > 0 ? duration : 0;
  const safeCurrentTime = Math.max(0, isFinite(currentTime) ? currentTime : 0);
  const boundedCurrentTime = safeDuration > 0 ? Math.min(safeCurrentTime, safeDuration) : safeCurrentTime;
  const progress = safeDuration > 0 ? Math.min(100, Math.max(0, (boundedCurrentTime / safeDuration) * 100)) : 0;

  const iconSize = compact ? 16 : 20;
  const playIconSize = compact ? 20 : 24;
  const playBtnClass = compact
    ? "p-3 bg-[#1a1a1a] text-[#FDF6F0] rounded-full hover:bg-[#1a1a1a]/90 transition-all"
    : "p-4 bg-[#1a1a1a] text-[#FDF6F0] rounded-full hover:bg-[#1a1a1a]/90 transition-all";
  const skipBtnClass = compact
    ? "p-2 text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5 rounded-full transition-all"
    : "p-3 text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5 rounded-full transition-all";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center w-full ${compact ? "gap-3 max-w-xs" : "gap-4 max-w-sm"}`}
    >
      {/* Progress bar with time */}
      <div className="w-full flex items-center gap-3">
        <span
          className="text-xs text-[#1a1a1a]/50 w-10 text-right"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {formatTime(boundedCurrentTime)}
        </span>
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={([value]) => onSeek((value / 100) * safeDuration)}
          className="flex-1"
        />
        <span
          className="text-xs text-[#1a1a1a]/50 w-10"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {formatTime(safeDuration)}
        </span>
      </div>

      {/* Control buttons */}
      <div className={`flex items-center ${compact ? "gap-4" : "gap-6"}`}>
        <button
          type="button"
          onClick={onSkipBackward}
          className={skipBtnClass}
          aria-label="Skip back 5 seconds"
        >
          <SkipBack size={iconSize} />
        </button>

        <button
          type="button"
          onClick={onPlayToggle}
          className={playBtnClass}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={playIconSize} /> : <Play size={playIconSize} className="ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={onSkipForward}
          className={skipBtnClass}
          aria-label="Skip forward 5 seconds"
        >
          <SkipForward size={iconSize} />
        </button>
      </div>

      {/* Skip labels */}
      <div className={`flex items-center ${compact ? "gap-10" : "gap-12"} text-[10px] tracking-[0.1em] uppercase text-[#1a1a1a]/30`}>
        <span>-5s</span>
        <span>+5s</span>
      </div>
    </motion.div>
  );
}
