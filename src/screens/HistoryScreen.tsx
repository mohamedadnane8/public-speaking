import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Session } from "@/types/session";

interface HistoryScreenProps {
  sessions: Session[];
  isAuthenticated: boolean;
  onBack: () => void;
  onDeleteSession: (id: string) => void;
  onReplayAudio: (session: Session) => void;
}

type StatusFilter = "ALL" | "COMPLETED" | "CANCELLED" | "FAILED";
type ModeFilter = "ALL" | Session["mode"];
type LanguageFilter = "ALL" | Session["language"];
type DifficultyFilter = "ALL" | Session["difficulty"];

function formatDate(value: string | undefined): string {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMode(mode: string): string {
  return mode.charAt(0) + mode.slice(1).toLowerCase();
}

function getSessionDate(session: Session): number {
  const value = session.completedAt || session.createdAt;
  const date = new Date(value).getTime();
  return Number.isNaN(date) ? 0 : date;
}

export function HistoryScreen({
  sessions,
  isAuthenticated,
  onBack,
  onDeleteSession,
  onReplayAudio,
}: HistoryScreenProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("ALL");
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("ALL");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => getSessionDate(b) - getSessionDate(a));
  }, [sessions]);

  const modeOptions = useMemo(() => {
    const values = new Set<Session["mode"]>();
    sortedSessions.forEach((session) => values.add(session.mode));
    return Array.from(values);
  }, [sortedSessions]);

  const languageOptions = useMemo(() => {
    const values = new Set<Session["language"]>();
    sortedSessions.forEach((session) => values.add(session.language ?? "EN"));
    return Array.from(values);
  }, [sortedSessions]);

  const difficultyOptions = useMemo(() => {
    const values = new Set<Session["difficulty"]>();
    sortedSessions.forEach((session) => values.add(session.difficulty ?? "MEDIUM"));
    return Array.from(values);
  }, [sortedSessions]);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sortedSessions.filter((session) => {
      const matchesQuery = normalizedQuery.length === 0
        || session.word.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "ALL" || session.status === statusFilter;
      const matchesMode = modeFilter === "ALL" || session.mode === modeFilter;
      const matchesLanguage = languageFilter === "ALL" || (session.language ?? "EN") === languageFilter;
      const matchesDifficulty = difficultyFilter === "ALL" || (session.difficulty ?? "MEDIUM") === difficultyFilter;
      return matchesQuery && matchesStatus && matchesMode && matchesLanguage && matchesDifficulty;
    });
  }, [sortedSessions, query, statusFilter, modeFilter, languageFilter, difficultyFilter]);

  const completedWithScore = useMemo(
    () => sortedSessions.filter((s) => s.status === "COMPLETED" && typeof s.overallScore === "number"),
    [sortedSessions]
  );

  const averageScore = completedWithScore.length > 0
    ? completedWithScore.reduce((sum, session) => sum + (session.overallScore || 0), 0) / completedWithScore.length
    : 0;

  const bestScore = completedWithScore.length > 0
    ? Math.max(...completedWithScore.map((session) => session.overallScore || 0))
    : 0;

  return (
    <motion.div
      key="history"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen w-full px-4 py-20"
    >
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p
              className="text-[10px] uppercase tracking-[0.25em] text-[#1a1a1a]/45"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              Practice Journal
            </p>
            <h1
              className="text-4xl text-[#1a1a1a]"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}
            >
              History
            </h1>
            <p
              className="text-sm text-[#1a1a1a]/55"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {isAuthenticated
                ? "Your latest sessions, scores, and reflections."
                : "Local history is available. Sign in to sync sessions across devices."}
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="w-fit border border-[#1a1a1a]/30 px-5 py-2 text-[10px] uppercase tracking-[0.2em] text-[#1a1a1a]/70 transition-colors hover:border-[#1a1a1a]/60 hover:text-[#1a1a1a]"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Back Home
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border border-[#1a1a1a]/15 bg-[#ffffff]/35 px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#1a1a1a]/45" style={{ fontFamily: '"Inter", sans-serif' }}>Sessions</p>
            <p className="mt-2 text-3xl text-[#1a1a1a]" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}>{sortedSessions.length}</p>
          </div>
          <div className="border border-[#1a1a1a]/15 bg-[#ffffff]/35 px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#1a1a1a]/45" style={{ fontFamily: '"Inter", sans-serif' }}>Average Score</p>
            <p className="mt-2 text-3xl text-[#1a1a1a]" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}>
              {completedWithScore.length > 0 ? averageScore.toFixed(1) : "—"}
            </p>
          </div>
          <div className="border border-[#1a1a1a]/15 bg-[#ffffff]/35 px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#1a1a1a]/45" style={{ fontFamily: '"Inter", sans-serif' }}>Best Score</p>
            <p className="mt-2 text-3xl text-[#1a1a1a]" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}>
              {completedWithScore.length > 0 ? bestScore.toFixed(1) : "—"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by prompt word..."
            className="w-full border border-[#1a1a1a]/20 bg-transparent px-4 py-3 text-sm text-[#1a1a1a] outline-none placeholder:text-[#1a1a1a]/35 focus:border-[#1a1a1a]/45"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          />
          <select
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value as ModeFilter)}
            className="border border-[#1a1a1a]/20 bg-transparent px-4 py-3 text-xs uppercase tracking-[0.15em] text-[#1a1a1a]/75 outline-none focus:border-[#1a1a1a]/45"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            <option value="ALL">All Modes</option>
            {modeOptions.map((mode) => (
              <option key={mode} value={mode}>{formatMode(mode)}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="border border-[#1a1a1a]/20 bg-transparent px-4 py-3 text-xs uppercase tracking-[0.15em] text-[#1a1a1a]/75 outline-none focus:border-[#1a1a1a]/45"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            <option value="ALL">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            value={languageFilter}
            onChange={(event) => setLanguageFilter(event.target.value as LanguageFilter)}
            className="border border-[#1a1a1a]/20 bg-transparent px-4 py-3 text-xs uppercase tracking-[0.15em] text-[#1a1a1a]/75 outline-none focus:border-[#1a1a1a]/45"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            <option value="ALL">All Lang</option>
            {languageOptions.map((language) => (
              <option key={language} value={language}>{language}</option>
            ))}
          </select>
          <select
            value={difficultyFilter}
            onChange={(event) => setDifficultyFilter(event.target.value as DifficultyFilter)}
            className="border border-[#1a1a1a]/20 bg-transparent px-4 py-3 text-xs uppercase tracking-[0.15em] text-[#1a1a1a]/75 outline-none focus:border-[#1a1a1a]/45"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            <option value="ALL">All Level</option>
            {difficultyOptions.map((difficulty) => (
              <option key={difficulty} value={difficulty}>{difficulty}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="border border-dashed border-[#1a1a1a]/20 px-6 py-10 text-center">
              <p className="text-sm text-[#1a1a1a]/55" style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}>
                No sessions match your filters yet.
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => setSelectedSession(session)}
                className="w-full border border-[#1a1a1a]/15 bg-[#ffffff]/30 px-4 py-4 text-left transition-colors hover:border-[#1a1a1a]/35 hover:bg-[#ffffff]/45"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xl text-[#1a1a1a]"
                        style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}
                      >
                        {session.word}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[#1a1a1a]/35" style={{ fontFamily: '"Inter", sans-serif' }}>
                        {formatMode(session.mode)} · {(session.language ?? "EN")} · {(session.difficulty ?? "MEDIUM")}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#1a1a1a]/50" style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}>
                      {formatDate(session.completedAt || session.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#1a1a1a]/45" style={{ fontFamily: '"Inter", sans-serif' }}>
                      {session.status}
                    </span>
                    <span
                      className="min-w-[3.5rem] text-right text-2xl text-[#1a1a1a]"
                      style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}
                    >
                      {typeof session.overallScore === "number" ? session.overallScore.toFixed(1) : "—"}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedSession && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSession(null)}
              className="fixed inset-0 z-40 bg-[#1a1a1a]/35"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-x-4 bottom-4 z-50 mx-auto max-h-[85vh] w-full max-w-2xl overflow-y-auto border border-[#1a1a1a]/20 bg-[#FDF6F0] p-5 shadow-lg"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#1a1a1a]/45" style={{ fontFamily: '"Inter", sans-serif' }}>
                    Session Detail
                  </p>
                  <h2 className="mt-1 text-3xl text-[#1a1a1a]" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}>
                    {selectedSession.word}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="text-[10px] uppercase tracking-[0.18em] text-[#1a1a1a]/50 hover:text-[#1a1a1a]"
                  style={{ fontFamily: '"Inter", sans-serif' }}
                >
                  Close
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border border-[#1a1a1a]/15 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#1a1a1a]/45" style={{ fontFamily: '"Inter", sans-serif' }}>When</p>
                  <p className="mt-1 text-sm text-[#1a1a1a]/80" style={{ fontFamily: '"Inter", sans-serif' }}>
                    {formatDate(selectedSession.completedAt || selectedSession.createdAt)}
                  </p>
                </div>
                <div className="border border-[#1a1a1a]/15 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#1a1a1a]/45" style={{ fontFamily: '"Inter", sans-serif' }}>Timing</p>
                  <p className="mt-1 text-sm text-[#1a1a1a]/80" style={{ fontFamily: '"Inter", sans-serif' }}>
                    {selectedSession.thinkSeconds}s think · {selectedSession.speakSeconds}s speak
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="border border-[#1a1a1a]/15 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#1a1a1a]/45" style={{ fontFamily: '"Inter", sans-serif' }}>Settings</p>
                  <p className="mt-1 text-sm text-[#1a1a1a]/80" style={{ fontFamily: '"Inter", sans-serif' }}>
                    {(selectedSession.language ?? "EN")} · {(selectedSession.difficulty ?? "MEDIUM")}
                  </p>
                </div>
                <div className="border border-[#1a1a1a]/15 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#1a1a1a]/45" style={{ fontFamily: '"Inter", sans-serif' }}>Status</p>
                  <p className="mt-1 text-sm text-[#1a1a1a]/80" style={{ fontFamily: '"Inter", sans-serif' }}>{selectedSession.status}</p>
                </div>
                <div className="border border-[#1a1a1a]/15 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#1a1a1a]/45" style={{ fontFamily: '"Inter", sans-serif' }}>Score</p>
                  <p className="mt-1 text-2xl text-[#1a1a1a]" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}>
                    {typeof selectedSession.overallScore === "number" ? selectedSession.overallScore.toFixed(1) : "—"}
                  </p>
                </div>
              </div>

              {selectedSession.ratings && (
                <div className="mt-3 border border-[#1a1a1a]/15 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#1a1a1a]/45" style={{ fontFamily: '"Inter", sans-serif' }}>
                    Ratings
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-[#1a1a1a]/75" style={{ fontFamily: '"Inter", sans-serif' }}>
                    <span>Opening: {selectedSession.ratings.opening ?? "—"}</span>
                    <span>Structure: {selectedSession.ratings.structure ?? "—"}</span>
                    <span>Ending: {selectedSession.ratings.ending ?? "—"}</span>
                    <span>Confidence: {selectedSession.ratings.confidence ?? "—"}</span>
                    <span>Clarity: {selectedSession.ratings.clarity ?? "—"}</span>
                    <span>Authenticity: {selectedSession.ratings.authenticity ?? "—"}</span>
                    <span>Expression: {selectedSession.ratings.languageExpression ?? "—"}</span>
                  </div>
                </div>
              )}

              {selectedSession.notes && (
                <div className="mt-3 border border-[#1a1a1a]/15 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#1a1a1a]/45" style={{ fontFamily: '"Inter", sans-serif' }}>Notes</p>
                  <p className="mt-2 text-sm text-[#1a1a1a]/75" style={{ fontFamily: '"Inter", sans-serif' }}>
                    {selectedSession.notes}
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={
                    !selectedSession.audio?.available ||
                    (!selectedSession.audio?.fileUri && !selectedSession.audio?.objectKey)
                  }
                  onClick={() => onReplayAudio(selectedSession)}
                  className="border border-[#1a1a1a]/25 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#1a1a1a]/70 transition-colors hover:border-[#1a1a1a]/45 hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-35"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  Replay Audio
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteSession(selectedSession.id);
                    setSelectedSession(null);
                  }}
                  className="border border-[#7A2E2E]/30 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#7A2E2E]/80 transition-colors hover:border-[#7A2E2E]/60 hover:text-[#7A2E2E]"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  Delete Session
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
