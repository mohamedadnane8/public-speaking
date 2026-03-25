import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";
import type { SessionAudio, SessionType, SessionRatings, InterviewRatings, TranscriptionStatus } from "@/types/session";
import type { User } from "@/hooks/useAuth";
import { AiAnalysis } from "@/components/AiAnalysis";
import { AudioPlayer } from "@/components/AudioPlayer";

interface ScoreSummaryScreenProps {
  overallScore: number;
  audio: SessionAudio | null | undefined;
  advice?: string | null;
  isSaving?: boolean;
  isSaved?: boolean;
  isAuthenticated?: boolean;
  user?: User | null;
  /** AI analysis props */
  sessionId?: string | null;
  sessionType?: SessionType;
  speechAnalysis?: unknown;
  transcriptionStatus?: TranscriptionStatus | null;
  isPollingTranscription?: boolean;
  transcript?: string;
  /** Self-review chart props */
  ratings?: SessionRatings;
  interviewRatings?: InterviewRatings;
  previousRatings?: SessionRatings;
  previousInterviewRatings?: InterviewRatings;
  /** Playback props */
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  playbackError?: boolean;
  onPlayToggle?: () => void;
  onSeek?: (time: number) => void;
  onSkipBackward?: () => void;
  onSkipForward?: () => void;
  onNewSession: () => void;
  onSaveAndGetAdvice: () => void;
}

export function ScoreSummaryScreen({
  overallScore,
  audio,
  advice = null,
  isSaving = false,
  isSaved = false,
  isAuthenticated = false,
  sessionId = null,
  sessionType,
  speechAnalysis,
  transcriptionStatus = null,
  isPollingTranscription = false,
  transcript,
  ratings,
  interviewRatings,
  previousRatings,
  previousInterviewRatings,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  playbackError = false,
  onPlayToggle,
  onSeek,
  onSkipBackward,
  onSkipForward,
  onNewSession,
  onSaveAndGetAdvice,
}: ScoreSummaryScreenProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"self" | "ai">("self");
  const showAiTab = isAuthenticated && isSaved && sessionId;

  const effectiveDuration = duration > 0
    ? duration
    : audio?.durationMs
    ? audio.durationMs / 1000
    : 0;
  const adviceText =
    advice ??
    (isAuthenticated
      ? t("score.generatingAdvice")
      : isSaving
      ? t("score.redirecting")
      : t("score.saveToGetAdvice"));
  const canRenderPlaybackControls = !!onPlayToggle && !!onSeek && !!onSkipBackward && !!onSkipForward;
  const canShowPlayer =
    canRenderPlaybackControls && !!audio?.available && !!audio.fileUri && !playbackError;

  return (
    <motion.div
      key="score-summary"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-16"
    >
      <div className="flex flex-col items-center space-y-12 w-full max-w-[min(100%,32rem)]">
        {/* Tabs */}
        {showAiTab && (
          <div className="flex gap-0 border-b border-[#1a1a1a]/10 w-full max-w-md justify-center">
            <button
              type="button"
              onClick={() => setActiveTab("self")}
              className={`px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                activeTab === "self"
                  ? "border-b-2 border-[#1a1a1a]/70 text-[#1a1a1a]/80"
                  : "text-[#1a1a1a]/40 hover:text-[#1a1a1a]/60"
              }`}
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: activeTab === "self" ? 500 : 400 }}
            >
              {t("score.selfReview")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                activeTab === "ai"
                  ? "border-b-2 border-[#1a1a1a]/70 text-[#1a1a1a]/80"
                  : "text-[#1a1a1a]/40 hover:text-[#1a1a1a]/60"
              }`}
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: activeTab === "ai" ? 500 : 400 }}
            >
              {t("score.aiAnalysisTab")}
            </button>
          </div>
        )}

        {/* Self Review tab content */}
        <div className={activeTab !== "self" ? "hidden" : ""}>
          {/* Score display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex items-center gap-2">
              <span
                className="text-sm tracking-[0.2em] text-[#1a1a1a]/60"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
              >
                {t("score.overallScore")}
              </span>
              <span
                className="text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 border border-[#1a1a1a]/15 text-[#1a1a1a]/40"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                {t("score.selfRated")}
              </span>
            </div>
            <span
              className="text-7xl sm:text-8xl md:text-9xl tracking-[0.05em] text-[#1a1a1a]"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
            >
              {overallScore.toFixed(1)}
            </span>
            <span
              className="text-xs tracking-[0.15em] text-[#1a1a1a]/40"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {t("score.outOf10")}
            </span>
          </motion.div>

          {(advice || isSaving || isSaved || isAuthenticated) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-12 w-full max-w-[min(100%,34rem)] border border-[#1a1a1a]/10 bg-[#1a1a1a]/[0.02] px-6 py-5"
            >
              <span
                className="block text-[10px] tracking-[0.18em] uppercase text-[#1a1a1a]/45"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 500 }}
              >
                {t("score.advice")}
              </span>
              <p
                className="mt-2 text-base sm:text-lg leading-tight text-[#1a1a1a]/88"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}
              >
                {adviceText}
              </p>
            </motion.div>
          )}

          {/* Self-review radar chart */}
          <SelfReviewRadarChart
            sessionType={sessionType}
            ratings={ratings}
            interviewRatings={interviewRatings}
            previousRatings={previousRatings}
            previousInterviewRatings={previousInterviewRatings}
          />
        </div>

        {/* AI Analysis tab content — always mounted to preserve state */}
        {showAiTab && (
          <div className={activeTab !== "ai" ? "hidden" : "w-full flex justify-center"}>
            <AiAnalysis
              sessionId={sessionId}
              sessionType={sessionType}
              speechAnalysis={speechAnalysis ?? null}
              transcriptionStatus={transcriptionStatus}
              isPolling={isPollingTranscription}
              transcript={transcript}
            />
          </div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-4"
        >
          {/* Primary: Continue */}
          <motion.button
            onClick={onNewSession}
            whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.92)" }}
            whileTap={{ scale: 0.98 }}
            className="px-12 py-4 bg-[#1a1a1a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {t("score.continue")}
          </motion.button>

          {!isAuthenticated ? (
            <motion.button
              onClick={onSaveAndGetAdvice}
              disabled={isSaving}
              whileHover={isSaving ? {} : { backgroundColor: "rgba(26, 26, 26, 0.06)" }}
              whileTap={isSaving ? {} : { scale: 0.98 }}
              className={`text-[11px] tracking-[0.15em] uppercase transition-colors px-4 py-2 rounded ${
                isSaving
                  ? "text-[#1a1a1a]/30 cursor-wait"
                  : "text-[#1a1a1a]/55 hover:text-[#1a1a1a]/80 hover:bg-[#1a1a1a]/5 cursor-pointer"
              }`}
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {isSaving ? t("score.redirectingBtn") : t("score.saveAndGetAdvice")}
            </motion.button>
          ) : (
            <span
              className="text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a]/45"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {isSaving ? t("score.savingSession") : isSaved ? t("score.sessionSaved") : t("score.autoSaving")}
            </span>
          )}

         

          {canRenderPlaybackControls && (
            <div className="mt-4 w-full flex justify-center">
              {canShowPlayer ? (
                <AudioPlayer
                  compact
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={effectiveDuration}
                  onPlayToggle={onPlayToggle!}
                  onSeek={onSeek!}
                  onSkipBackward={onSkipBackward!}
                  onSkipForward={onSkipForward!}
                />
              ) : (
                <span
                  className="text-[11px] tracking-[0.12em] uppercase text-[#1a1a1a]/45"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  {t("playback.recordingUnavailable")}
                </span>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Self-Review Radar Chart ─────────────────────────────────────

const GENERAL_CRITERIA = [
  { key: "opening", label: "score.chartOpening" },
  { key: "structure", label: "score.chartStructure" },
  { key: "ending", label: "score.chartEnding" },
  { key: "confidence", label: "score.chartConfidence" },
  { key: "clarity", label: "score.chartClarity" },
  { key: "authenticity", label: "score.chartAuthenticity" },
  { key: "languageExpression", label: "score.chartExpression" },
] as const;

const INTERVIEW_CRITERIA = [
  { key: "relevance", label: "score.chartRelevance" },
  { key: "situationStakes", label: "score.chartSituation" },
  { key: "action", label: "score.chartAction" },
  { key: "resultImpact", label: "score.chartResult" },
  { key: "deliveryComposure", label: "score.chartDelivery" },
  { key: "conciseness", label: "score.chartConciseness" },
] as const;

function SelfReviewRadarChart({
  sessionType,
  ratings,
  interviewRatings,
  previousRatings,
  previousInterviewRatings,
}: {
  sessionType?: SessionType;
  ratings?: SessionRatings;
  interviewRatings?: InterviewRatings;
  previousRatings?: SessionRatings;
  previousInterviewRatings?: InterviewRatings;
}) {
  const { t } = useTranslation();

  const data = useMemo(() => {
    if (sessionType === "Interview" && interviewRatings) {
      return INTERVIEW_CRITERIA.map((c) => ({
        criterion: t(c.label),
        current: interviewRatings[c.key] ?? 0,
        previous: previousInterviewRatings?.[c.key] ?? undefined,
        fullMark: 5,
      }));
    }
    if (ratings) {
      return GENERAL_CRITERIA.map((c) => ({
        criterion: t(c.label),
        current: ratings[c.key] ?? 0,
        previous: previousRatings?.[c.key] ?? undefined,
        fullMark: 5,
      }));
    }
    return [];
  }, [sessionType, ratings, interviewRatings, previousRatings, previousInterviewRatings, t]);

  if (data.length === 0) return null;

  const hasPrevious = data.some((d) => d.previous !== undefined);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-8 w-full max-w-md"
    >
      <h4
        className="text-[10px] tracking-[0.18em] uppercase text-[#1a1a1a]/50 text-center mb-2"
        style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
      >
        {t("score.selfRatings")}
      </h4>
      <div className="w-full flex justify-center">
        <div className="w-full max-w-[300px]">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="65%">
              <PolarGrid stroke="rgba(26,26,26,0.08)" />
              <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
              <PolarAngleAxis
                dataKey="criterion"
                tick={{
                  fontSize: 9,
                  fill: "rgba(26,26,26,0.5)",
                  fontFamily: '"Inter", sans-serif',
                }}
              />
              {hasPrevious && (
                <Radar
                  name={t("score.previousSession")}
                  dataKey="previous"
                  stroke="rgba(26,26,26,0.25)"
                  fill="rgba(26,26,26,0.04)"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  dot={{ r: 2, fill: "rgba(26,26,26,0.25)", strokeWidth: 0 }}
                />
              )}
              <Radar
                name={t("score.currentSession")}
                dataKey="current"
                stroke="#1a1a1a"
                fill="rgba(26,26,26,0.06)"
                strokeWidth={1.5}
                dot={{ r: 3, fill: "#1a1a1a", strokeWidth: 0 }}
              />
              {hasPrevious && (
                <Legend
                  wrapperStyle={{
                    fontSize: 9,
                    fontFamily: '"Inter", sans-serif',
                    color: "rgba(26,26,26,0.5)",
                  }}
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
