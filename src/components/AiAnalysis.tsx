import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
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

interface FillerCategoryBreakdown {
  count: number;
  words: Record<string, number>;
}

interface FillerBreakdown {
  hesitation_sounds: FillerCategoryBreakdown;
  padding_phrases: FillerCategoryBreakdown;
  verbal_tics: FillerCategoryBreakdown;
  restarts: { count: number };
}

interface FillerAnalysis {
  total_count: number;
  estimated_duration_minutes: number;
  filler_rate_per_minute: number;
  rate_label: string;
  clustering_note?: string;
  breakdown?: FillerBreakdown;
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
  transcript?: string;
}

export function AiAnalysis({
  sessionId,
  sessionType,
  speechAnalysis,
  transcriptionStatus,
  isPolling,
  transcript,
}: AiAnalysisProps) {
  const { t } = useTranslation();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<unknown>(speechAnalysis);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState(() => getUsageToday().count);

  // Keep internal analysis state aligned with the active session props.
  useEffect(() => {
    setAnalysisResult(speechAnalysis ?? null);
    setAnalysisError(null);
  }, [speechAnalysis, sessionId, sessionType]);

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
              {t("ai.aiScore")}
            </span>
          </div>
        </div>

        {/* Radar Chart */}
        <CriteriaRadarChart scores={analysis.scores} />

        {/* Filler Analysis */}
        {analysis.filler_analysis && (
          <div className="border border-[#1a1a1a]/10 px-4 py-3">
            <h4
              className="text-[10px] tracking-[0.18em] uppercase text-[#1a1a1a]/50 mb-2"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {t("ai.fillerWords")}
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
                {t("ai.topOffenders", { offenders: analysis.filler_analysis.top_offenders.slice(0, 3).join(", ") })}
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

        {/* Annotated Transcript */}
        {analysis.filler_analysis?.breakdown && transcript && (
          <AnnotatedTranscript
            transcript={transcript}
            breakdown={analysis.filler_analysis.breakdown}
          />
        )}

        {/* Per-criterion scores */}
        <div className="flex flex-col gap-3">
          <h4
            className="text-[10px] tracking-[0.18em] uppercase text-[#1a1a1a]/50 text-center"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {t("ai.criteriaBreakdown")}
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
                {t("ai.strength")}
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
                {t("ai.focusOn")}
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
          {t("ai.analysesToday", { count: usageCount, limit: DAILY_LIMIT })}
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
            {t("ai.analyzingSpeech")}
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
              ? t("ai.limitReached")
              : isPolling || transcriptionStatus === "Pending" || transcriptionStatus === "Processing"
                ? t("ai.waitingForTranscript")
                : isTranscriptFailed
                  ? t("ai.transcriptFailed")
                  : t("ai.aiAnalysis")}
          </motion.button>

          <span
            className="text-[9px] tracking-[0.08em] text-[#1a1a1a]/30"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {limitReached
              ? t("ai.resetsTomorrow")
              : t("ai.analysesToday", { count: usageCount, limit: DAILY_LIMIT })}
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

// ─── Annotated Transcript ───────────────────────────────────────

type FillerCategory = "hesitation_sounds" | "padding_phrases" | "verbal_tics";

interface TranscriptSegment {
  text: string;
  category: FillerCategory | null;
  fillerWord: string | null;
}

const CATEGORY_STYLES: Record<FillerCategory, { bg: string; label: string }> = {
  hesitation_sounds: { bg: "bg-orange-200/60", label: "ai.hesitation" },
  padding_phrases: { bg: "bg-purple-200/60", label: "ai.padding" },
  verbal_tics: { bg: "bg-blue-200/60", label: "ai.verbalTics" },
};

const CATEGORY_DOTS: Record<FillerCategory, string> = {
  hesitation_sounds: "bg-orange-300",
  padding_phrases: "bg-purple-300",
  verbal_tics: "bg-blue-300",
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasArabic(str: string): boolean {
  return /[\u0600-\u06FF]/.test(str);
}

function tokenizeTranscript(
  transcript: string,
  breakdown: FillerBreakdown,
): TranscriptSegment[] {
  const entries: { word: string; category: FillerCategory }[] = [];
  const categories: FillerCategory[] = ["hesitation_sounds", "padding_phrases", "verbal_tics"];

  for (const cat of categories) {
    const catData = breakdown[cat];
    if (catData?.words) {
      for (const word of Object.keys(catData.words)) {
        entries.push({ word, category: cat });
      }
    }
  }

  if (entries.length === 0) {
    return [{ text: transcript, category: null, fillerWord: null }];
  }

  // Sort by length descending so multi-word phrases match first
  entries.sort((a, b) => b.word.length - a.word.length);

  // Build regex patterns with proper word boundaries
  const patterns = entries.map((e) => {
    const escaped = escapeRegex(e.word);
    if (hasArabic(e.word)) {
      return `(?:^|(?<=\\s))${escaped}(?:$|(?=\\s))`;
    }
    return `\\b${escaped}\\b`;
  });

  const regex = new RegExp(`(${patterns.join("|")})`, "gi");

  // Build a lookup: lowercased word → category
  const wordCategoryMap = new Map<string, FillerCategory>();
  for (const e of entries) {
    wordCategoryMap.set(e.word.toLowerCase(), e.category);
  }

  const segments: TranscriptSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(transcript)) !== null) {
    // Plain text before this match
    if (match.index > lastIndex) {
      segments.push({
        text: transcript.slice(lastIndex, match.index),
        category: null,
        fillerWord: null,
      });
    }

    const matchedText = match[0];
    const category = wordCategoryMap.get(matchedText.toLowerCase()) ?? null;
    segments.push({
      text: matchedText,
      category,
      fillerWord: matchedText.toLowerCase(),
    });

    lastIndex = match.index + matchedText.length;
  }

  // Remaining text
  if (lastIndex < transcript.length) {
    segments.push({
      text: transcript.slice(lastIndex),
      category: null,
      fillerWord: null,
    });
  }

  return segments;
}

function AnnotatedTranscript({
  transcript,
  breakdown,
}: {
  transcript: string;
  breakdown: FillerBreakdown;
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const segments = useMemo(
    () => tokenizeTranscript(transcript, breakdown),
    [transcript, breakdown],
  );

  // Collect word counts for tooltip
  const wordCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const categories: FillerCategory[] = ["hesitation_sounds", "padding_phrases", "verbal_tics"];
    for (const cat of categories) {
      const catData = breakdown[cat];
      if (catData?.words) {
        for (const [word, count] of Object.entries(catData.words)) {
          counts.set(word.toLowerCase(), count);
        }
      }
    }
    return counts;
  }, [breakdown]);

  return (
    <div className="border border-[#1a1a1a]/10">
      {/* Collapsible header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a]/[0.02] transition-colors"
      >
        <span
          className="text-[10px] tracking-[0.18em] uppercase text-[#1a1a1a]/50"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {t("ai.annotatedTranscript")}
        </span>
        <svg
          className={`w-3 h-3 text-[#1a1a1a]/40 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Color legend */}
          <div className="flex items-center gap-4 mb-3">
            {(Object.entries(CATEGORY_STYLES) as [FillerCategory, { bg: string; label: string }][]).map(
              ([cat, style]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${CATEGORY_DOTS[cat]}`} />
                  <span
                    className="text-[9px] tracking-[0.1em] uppercase text-[#1a1a1a]/45"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    {t(style.label)}
                  </span>
                </div>
              ),
            )}
          </div>

          {/* Transcript body */}
          <div
            dir="auto"
            className="max-h-60 overflow-y-auto border border-[#1a1a1a]/5 bg-[#1a1a1a]/[0.015] px-3 py-2.5 text-[12px] leading-relaxed text-[#1a1a1a]/75"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {segments.map((seg, i) =>
              seg.category ? (
                <span key={i} className="group relative inline">
                  <span
                    className={`${CATEGORY_STYLES[seg.category].bg} rounded-sm px-0.5 cursor-default`}
                  >
                    {seg.text}
                  </span>
                  {/* Tooltip */}
                  <span
                    className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap px-2 py-1 text-[9px] tracking-[0.08em] bg-[#1a1a1a] text-[#FDF6F0]/90 rounded z-10"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    {t(CATEGORY_STYLES[seg.category].label)} — {wordCounts.get(seg.fillerWord ?? "") ?? 0}x
                  </span>
                </span>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Radar Chart ────────────────────────────────────────────────

const LABEL_MAP: Record<string, string> = {
  opening: "ai.opening",
  structure: "ai.structure",
  closing: "ai.closing",
  confidence: "ai.confidence",
  clarity: "ai.clarity",
  authenticity: "ai.authenticity",
  language: "ai.language",
  passion: "ai.passion",
  relevance: "ai.relevance",
  situation: "ai.situation",
  action: "ai.action",
  result: "ai.result",
  delivery: "ai.delivery",
  conciseness: "ai.conciseness",
};

function CriteriaRadarChart({ scores }: { scores: Record<string, ScoreEntry> }) {
  const { t } = useTranslation();
  const data = useMemo(
    () =>
      Object.entries(scores).map(([key, score]) => ({
        criterion: LABEL_MAP[key] ? t(LABEL_MAP[key]) : key.replace(/_/g, " "),
        score: score.raw,
        fullMark: 5,
      })),
    [scores]
  );

  if (data.length === 0) return null;

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[280px]">
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="rgba(26,26,26,0.08)" />
            <PolarAngleAxis
              dataKey="criterion"
              tick={{
                fontSize: 9,
                fill: "rgba(26,26,26,0.5)",
                fontFamily: '"Inter", sans-serif',
              }}
            />
            <Radar
              dataKey="score"
              stroke="#1a1a1a"
              fill="rgba(26,26,26,0.06)"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "#1a1a1a", strokeWidth: 0 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
