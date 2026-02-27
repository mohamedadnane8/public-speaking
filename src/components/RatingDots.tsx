import { motion } from "framer-motion";
import type { RatingValue } from "@/types/session";

interface RatingDotsProps {
  label: string;
  value?: RatingValue;
  onChange: (value: RatingValue) => void;
}

export function RatingDots({ label, value, onChange }: RatingDotsProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span
        className="text-xs tracking-[0.2em] uppercase text-[#1a1a1a]/60"
        style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
      >
        {label}
      </span>
      <div className="flex items-center gap-3">
        {[1, 2, 3, 4, 5].map((dotValue) => {
          const isSelected = value !== undefined && dotValue <= value;
          const isExact = value === dotValue;

          return (
            <motion.button
              key={dotValue}
              type="button"
              onClick={() => onChange(dotValue as RatingValue)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-1"
              aria-label={`Rate ${label} ${dotValue} out of 5`}
            >
              <motion.div
                className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                  isSelected
                    ? "bg-[#1a1a1a]"
                    : "bg-transparent border border-[#1a1a1a]/30"
                }`}
                animate={{
                  scale: isExact ? 1.2 : 1,
                }}
                transition={{ duration: 0.15 }}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
