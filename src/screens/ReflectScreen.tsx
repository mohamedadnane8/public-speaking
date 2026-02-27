import { motion } from "framer-motion";
import { RatingDots } from "@/components/RatingDots";
import type { SessionRatings, RatingValue } from "@/types/session";

interface ReflectScreenProps {
  ratings: Partial<SessionRatings>;
  notes: string;
  canComplete: boolean;
  onRateChange: (criteria: keyof SessionRatings, value: RatingValue) => void;
  onNotesChange: (notes: string) => void;
  onDone: () => void;
}

export function ReflectScreen({
  ratings,
  notes,
  canComplete,
  onRateChange,
  onNotesChange,
  onDone,
}: ReflectScreenProps) {
  return (
    <motion.div
      key="reflect"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full flex flex-col items-center justify-center px-4"
    >
      <div className="flex flex-col items-center space-y-10 w-full max-w-[min(100%,32rem)]">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span
            className="text-sm tracking-[0.2em] text-[#1a1a1a]/80"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
          >
            Reflect.
          </span>
        </motion.div>

        {/* Rating criteria */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center gap-6"
        >
          <RatingDots
            label="Opening"
            value={ratings.opening}
            onChange={(v) => onRateChange("opening", v)}
          />
          <RatingDots
            label="Structure"
            value={ratings.structure}
            onChange={(v) => onRateChange("structure", v)}
          />
          <RatingDots
            label="Ending"
            value={ratings.ending}
            onChange={(v) => onRateChange("ending", v)}
          />
          <RatingDots
            label="Confidence"
            value={ratings.confidence}
            onChange={(v) => onRateChange("confidence", v)}
          />
          <RatingDots
            label="Clarity"
            value={ratings.clarity}
            onChange={(v) => onRateChange("clarity", v)}
          />
          <RatingDots
            label="Authenticity"
            value={ratings.authenticity}
            onChange={(v) => onRateChange("authenticity", v)}
          />
          <RatingDots
            label="Language & Expression"
            value={ratings.languageExpression}
            onChange={(v) => onRateChange("languageExpression", v)}
          />
        </motion.div>

        {/* Notes textarea */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-sm"
        >
          <label
            className="block text-xs tracking-[0.2em] uppercase text-[#1a1a1a]/60 mb-3 text-center"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add your thoughts..."
            rows={4}
            className="w-full px-4 py-3 bg-transparent border border-[#1a1a1a]/20 text-sm text-[#1a1a1a]/80 placeholder:text-[#1a1a1a]/30 resize-none focus:outline-none focus:border-[#1a1a1a]/50 transition-colors"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          />
        </motion.div>

        {/* Done button */}
        <motion.button
          onClick={onDone}
          disabled={!canComplete}
          initial={{ opacity: 0 }}
          animate={{ opacity: canComplete ? 1 : 0.4 }}
          whileHover={canComplete ? { backgroundColor: "rgba(26, 26, 26, 0.92)" } : {}}
          whileTap={canComplete ? { scale: 0.98 } : {}}
          className={`px-10 py-4 text-xs tracking-[0.25em] uppercase transition-all duration-300 ${
            canComplete
              ? "bg-[#1a1a1a] text-[#FDF6F0]/90 cursor-pointer"
              : "bg-[#1a1a1a]/30 text-[#FDF6F0]/60 cursor-not-allowed"
          }`}
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          DONE
        </motion.button>
      </div>
    </motion.div>
  );
}
