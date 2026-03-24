import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { analyzeSession } from "@/lib/interviewApi";
import type { SessionType, TranscriptionStatus } from "@/types/session";

const DAILY_LIMIT = 3;
const STORAGE_KEY = "ai_analysis_usage";

interface DailyUsage {
  date: string;
  count: number;
}

function getUsageToday(): DailyUsage {
  const today = new Date().toISOString().split("T")[0];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const usage = JSON.parse(stored) as DailyUsage;
      if (usage.date === today) return usage;
    }
  } catch { /* ignore */ }
  return { date: today, count: 0 };
}

function incrementUsage(): void {
  const usage = getUsageToday();
  usage.count += 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

// Band colors
function getBandStyle(band: string): { color: string; bg: string } {
  switch (band) {
    case "Exceptional": return { color: "text-[#2E7A4E]", bg: "bg-[#2E7A4E]/10" };
    case "Solid": return { color: "text-[#4A6FA5]", bg: "bg-[#4A6FA5]/10" };
    case "Developing": return { color: "text-[#B8860B]", bg: "bg-[#B8860B]/10" };
    default: return { color: "text-[#7A2E2E]", bg: "bg-[#7A2E2E]/10" };
  }
}

interface ScoreEntry {
  raw: number;
  weighted?: number;
  bonus_points?: number;
  feedback: string;
}

interface FillerAnalysis {
  total_count: number;
  estimated_duration_minutes: number;
  filler_rate_per_minute: number;
  rate_label: string;
  clustering_note?: string;
  top_offenders: string[];
}

interface AnalysisResult {
  filler_analysis: FillerAnalysis;
  scores: Record<string, ScoreEntry>;
  base_score: number;
  total_score: number;
  band: string;
  top_strength: string;
  top_improvement: string;
  gate_applied?: boolean;
}

interface AiAnalysisProps {
  sessionId: string | null;
  sessionType?: SessionType;
  speechAnalysis: unknown;
  transcriptionStatus: TranscriptionStatus | null;
  isPolling: boolean;
}

export function AiAnalysis({
  sessionId,
  sessionType,
  speechAnalysis,
  transcriptionStatus,
  isPolling,
}: AiAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<unknown>(speechAnalysis);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState(() => getUsageToday().count);

  const isTranscriptReady = transcriptionStatus === "Completed";
  const isTranscriptFailed = transcriptionStatus === "Failed";
  const hasAnalysis = !!analysisResult;
  const limitReached = usageCount >= DAILY_LIMIT;

  const handleAnalyze = useCallback(async () => {
    if (!sessionId || limitReached) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await analyzeSession(sessionId);
      setAnalysisResult(result);
      incrementUsage();
      setUsageCount((prev) => prev + 1);
    } catch (err) {
      setAnalysisError((err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [sessionId, limitReached]);

  // Extract the right analysis based on session type
  const analysis: AnalysisResult | null = (() => {
    if (!analysisResult || typeof analysisResult !== "object") return null;
    const data = analysisResult as Record<string, unknown>;
    if (sessionType === "Interview" && data.interviewAnalysis) {
      return data.interviewAnalysis as AnalysisResult;
    }
    if (data.generalAnalysis) {
      return data.generalAnalysis as AnalysisResult;
    }
    // Direct result (already the analysis object)
    if (data.scores && data.band) {
      return data as unknown as AnalysisResult;
    }
    return null;
  })();

  // Render analysis results
  if (hasAnalysis && analysis) {
    const bandStyle = getBandStyle(analysis.band);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col gap-6"
      >
        {/* Band + AI Score */}
        <div className="flex items-center justify-center gap-4">
          <span
            className={`px-3 py-1 text-[10px] tracking-[0.18em] uppercase ${bandStyle.color} ${bandStyle.bg}`}
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 500 }}
          >
            {analysis.band}
          </span>
          <div className="flex items-baseline gap-1">
            <span
              className="text-2xl text-[#1a1a1a]"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}
            >
              {analysis.total_score.toFixed(1)}
            </span>
            <span
              className="text-[10px] text-[#1a1a1a]/40"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              AI Score
            </span>
          </div>
        </div>

        {/* Filler Analysis */}
        {analysis.filler_analysis && (
          <div className="border border-[#1a1a1a]/10 px-4 py-3">
            <h4
              className="text-[10px] tracking-[0.18em] uppercase text-[#1a1a1a]/50 mb-2"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              Filler Words
            </h4>
            <div className="flex items-center gap-4 mb-2">
              <span
                className="text-lg text-[#1a1a1a]/80"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}
              >
                {analysis.filler_analysis.filler_rate_per_minute.toFixed(1)}/min
              </span>
              <span
                className={`text-[10px] tracking-[0.1em] uppercase px-2 py-0.5 ${
                  analysis.filler_analysis.rate_label === "Excellent" || analysis.filler_analysis.rate_label === "Good"
                    ? "text-[#2E7A4E]/80 bg-[#2E7A4E]/8"
                    : analysis.filler_analysis.rate_label === "Fair"
                      ? "text-[#B8860B]/80 bg-[#B8860B]/8"
                      : "text-[#7A2E2E]/80 bg-[#7A2E2E]/8"
                }`}
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                {analysis.filler_analysis.rate_label}
              </span>
            </div>
            {analysis.filler_analysis.top_offenders.length > 0 && (
              <p
                className="text-[11px] text-[#1a1a1a]/50"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                Top: {analysis.filler_analysis.top_offenders.slice(0, 3).join(", ")}
              </p>
            )}
            {analysis.filler_analysis.clustering_note && (
              <p
                className="text-[10px] text-[#1a1a1a]/40 mt-1 italic"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                {analysis.filler_analysis.clustering_note}
              </p>
            )}
          </div>
        )}

        {/* Per-criterion scores */}
        <div className="flex flex-col gap-3">
          <h4
            className="text-[10px] tracking-[0.18em] uppercase text-[#1a1a1a]/50 text-center"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Criteria Breakdown
          </h4>
          {Object.entries(analysis.scores).map(([key, score]) => (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] tracking-[0.08em] capitalize text-[#1a1a1a]/70"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  {key.replace(/_/g, " ")}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((dot) => (
                    <div
                      key={dot}
                      className={`w-1.5 h-1.5 rounded-full ${
                        dot <= score.raw ? "bg-[#1a1a1a]/60" : "bg-[#1a1a1a]/15"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p
                className="text-[10px] text-[#1a1a1a]/45 leading-relaxed"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                {score.feedback}
              </p>
            </div>
          ))}
        </div>

        {/* Strength + Improvement */}
        <div className="flex flex-col gap-3">
          {analysis.top_strength && (
            <div className="border-l-2 border-[#2E7A4E]/40 pl-3">
              <span
                className="text-[9px] tracking-[0.15em] uppercase text-[#2E7A4E]/60 block mb-1"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                Strength
              </span>
              <p
                className="text-[11px] text-[#1a1a1a]/65 leading-relaxed"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                {analysis.top_strength}
              </p>
            </div>
          )}
          {analysis.top_improvement && (
            <div className="border-l-2 border-[#B8860B]/40 pl-3">
              <span
                className="text-[9px] tracking-[0.15em] uppercase text-[#B8860B]/60 block mb-1"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                Focus on
              </span>
              <p
                className="text-[11px] text-[#1a1a1a]/65 leading-relaxed"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                {analysis.top_improvement}
              </p>
            </div>
          )}
        </div>

        {/* Usage counter */}
        <p
          className="text-[9px] tracking-[0.08em] text-[#1a1a1a]/30 text-center"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {usageCount}/{DAILY_LIMIT} analyses today
        </p>
      </motion.div>
    );
  }

  // Render button / waiting state
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col items-center gap-3"
    >
      {isAnalyzing ? (
        <div className="flex items-center gap-3 py-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-[#1a1a1a]/20 border-t-[#1a1a1a]/60 rounded-full"
          />
          <span
            className="text-[10px] tracking-[0.15em] uppercase text-[#1a1a1a]/50"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Analyzing speech...
          </span>
        </div>
      ) : (
        <>
          <motion.button
            onClick={handleAnalyze}
            disabled={!isTranscriptReady || limitReached || !sessionId}
            whileHover={isTranscriptReady && !limitReached ? { backgroundColor: "rgba(26, 26, 26, 0.08)" } : undefined}
            whileTap={isTranscriptReady && !limitReached ? { scale: 0.98 } : undefined}
            className={`px-8 py-3 border text-xs tracking-[0.25em] uppercase transition-all duration-300 ${
              isTranscriptReady && !limitReached
                ? "border-[#1a1a1a]/60 text-[#1a1a1a] hover:border-[#1a1a1a]"
                : "border-[#1a1a1a]/20 text-[#1a1a1a]/30 cursor-not-allowed"
            }`}
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {limitReached
              ? "Limit reached"
              : isPolling || transcriptionStatus === "Pending" || transcriptionStatus === "Processing"
                ? "Waiting for transcript..."
                : isTranscriptFailed
                  ? "Transcript failed"
                  : "AI Analysis"}
          </motion.button>

          <span
            className="text-[9px] tracking-[0.08em] text-[#1a1a1a]/30"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {limitReached
              ? "Resets tomorrow"
              : `${usageCount}/${DAILY_LIMIT} analyses today`}
          </span>
        </>
      )}

      {analysisError && (
        <span
          className="text-[10px] tracking-[0.1em] text-[#7A2E2E]/70 text-center"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {analysisError}
        </span>
      )}
    </motion.div>
  );
}
