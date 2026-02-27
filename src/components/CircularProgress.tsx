import { motion } from "framer-motion";

interface CircularProgressProps {
  progress: number; // 0 to 1
  seconds: number;
  isLowTime?: boolean;
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}

const SIZES = {
  sm: { width: 200, radius: 90, strokeWidth: 1.5 },
  md: { width: 280, radius: 130, strokeWidth: 2 },
  lg: { width: 360, radius: 170, strokeWidth: 2 },
};

export function CircularProgress({
  progress,
  seconds,
  isLowTime = false,
  size = "md",
  children,
}: CircularProgressProps) {
  const { width, radius, strokeWidth } = SIZES[size];
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg
        className="absolute pointer-events-none"
        width={width}
        height={width}
        viewBox={`0 0 ${width} ${width}`}
        aria-hidden
      >
        {/* Outer circle - subtle track */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth={strokeWidth * 0.25}
          strokeOpacity={0.12}
        />
        {/* Active progress */}
        <motion.circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{
            strokeDashoffset,
            stroke: isLowTime ? "#7A2E2E" : "#1a1a1a",
          }}
          transition={{ duration: 0.3, ease: "linear" }}
          transform={`rotate(-90 ${width / 2} ${width / 2})`}
          style={{ opacity: 0.55 }}
        />
      </svg>

      <div className="relative z-0 flex flex-col items-center gap-1">
        {children}
        <span
          className={`text-2xl sm:text-3xl tabular-nums tracking-widest transition-colors duration-300 ${
            isLowTime ? "text-[#7A2E2E]" : "text-[#1a1a1a]/45"
          }`}
          style={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 300,
          }}
        >
          {formatTime(seconds)}
        </span>
      </div>
    </div>
  );
}
