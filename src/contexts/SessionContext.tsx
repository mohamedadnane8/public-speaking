import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useSession } from "../hooks/useSession";
import { useTranscriptionPolling } from "../hooks/useTranscriptionPolling";
import { useAppContext } from "./AppContext";
import { apiClient } from "../lib/apiClient";
import { recordSession, updateSession, triggerTranscription } from "../lib/interviewApi";
import type { Session, SessionLanguage, SessionDifficulty } from "../types/session";

// ─── Helper functions ───────────────────────────────────────────

function pickDeterministicIndex(seed: string, salt: string, size: number): number {
  if (size <= 1) return 0;
  let hash = 2166136261;
  const input = `${seed}:${salt}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % size;
}

function buildFallbackAdvice(session: Session): string | null {
  const ratings = session.ratings;
  if (!ratings) return null;

  const entries = [
    ["opening", ratings.opening],
    ["structure", ratings.structure],
    ["ending", ratings.ending],
    ["confidence", ratings.confidence],
    ["clarity", ratings.clarity],
    ["authenticity", ratings.authenticity],
    ["language expression", ratings.languageExpression],
  ] as const;

  const scored = entries.filter((entry) => typeof entry[1] === "number") as Array<[string, number]>;
  if (scored.length === 0) return null;

  const weakestScore = Math.min(...scored.map((entry) => entry[1]));
  const average = scored.reduce((sum, entry) => sum + entry[1], 0) / scored.length;
  const strongestWeakestTie = Math.max(...scored.map((entry) => entry[1])) === weakestScore;
  const sessionSeed = session.id || "session";

  const weakestCandidates = scored
    .filter((entry) => entry[1] === weakestScore)
    .sort((a, b) => a[0].localeCompare(b[0]));

  const tieCandidates = scored.sort((a, b) => a[0].localeCompare(b[0]));

  const target = strongestWeakestTie
    ? tieCandidates[pickDeterministicIndex(sessionSeed, "tie", tieCandidates.length)]
    : weakestCandidates[pickDeterministicIndex(sessionSeed, "weakest", weakestCandidates.length)];
  if (!target) return null;

  const tonePrefix = average >= 4.2
    ? `Next polish: ${target[0]}.`
    : average >= 3.2
    ? `Focus next on ${target[0]}.`
    : `Priority: ${target[0]}.`;

  const scoreForMessage = strongestWeakestTie
    ? (average >= 4.2 ? 4 : average >= 3.2 ? 3 : 2)
    : weakestScore;

  const actionText =
    scoreForMessage <= 2
      ? "Make this your priority in the next round."
      : scoreForMessage === 3
      ? "Improve it with clearer structure and cleaner transitions."
      : "Polish it for a sharper and more intentional delivery.";

  return `${tonePrefix} ${actionText}`;
}

function extractAdviceFromSaveResponse(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const direct = (payload as { advice?: unknown }).advice;
  if (typeof direct === "string" && direct.trim().length > 0) return direct.trim();
  const nested = (payload as { session?: { advice?: unknown } }).session?.advice;
  if (typeof nested === "string" && nested.trim().length > 0) return nested.trim();
  return null;
}

function resolveUploadFormat(contentType?: string): { extension: string; contentType: string } | null {
  const normalized = (contentType || "").toLowerCase();
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return { extension: ".mp3", contentType: "audio/mpeg" };
  if (normalized.includes("wav")) return { extension: ".wav", contentType: "audio/wav" };
  if (normalized.includes("mp4") || normalized.includes("m4a") || normalized.includes("aac")) return { extension: ".m4a", contentType: "audio/mp4" };
  if (normalized.includes("webm")) return { extension: ".webm", contentType: "audio/webm" };
  if (normalized.includes("ogg") || normalized.includes("opus")) return { extension: ".ogg", contentType: "audio/ogg" };
  if (normalized.length === 0) return { extension: ".webm", contentType: "audio/webm" };
  return null;
}

type AudioUploadResponse = {
  objectKey: string;
  bucketName: string;
  region: string;
  fileSize: number;
  contentType: string;
};

const DEFAULT_LANGUAGE: SessionLanguage = "EN";
const DEFAULT_DIFFICULTY: SessionDifficulty = "MEDIUM";

// ─── Context ────────────────────────────────────────────────────

interface SessionContextValue {
  // useSession passthrough
  session: ReturnType<typeof useSession>["session"];
  sessions: ReturnType<typeof useSession>["sessions"];
  audio: ReturnType<typeof useSession>["audio"];
  isRecording: boolean;
  usedWords: string[];
  createSession: ReturnType<typeof useSession>["createSession"];
  completeSession: ReturnType<typeof useSession>["completeSession"];
  cancelSession: ReturnType<typeof useSession>["cancelSession"];
  startRecording: ReturnType<typeof useSession>["startRecording"];
  stopRecording: ReturnType<typeof useSession>["stopRecording"];
  resetRecording: ReturnType<typeof useSession>["resetRecording"];
  restoreSession: ReturnType<typeof useSession>["restoreSession"];
  deleteHistorySession: ReturnType<typeof useSession>["deleteHistorySession"];
  addUsedWord: ReturnType<typeof useSession>["addUsedWord"];
  resetUsedWords: ReturnType<typeof useSession>["resetUsedWords"];

  // Save state
  isSaving: boolean;
  savedSessionId: string | null;
  savedServerSessionId: string | null;
  savedSpeechAnalysis: unknown;
  earlySaveStatus: "idle" | "saving" | "saved" | "failed";
  remoteSessions: Session[] | null;
  historySessions: Session[];

  // Actions
  saveSessionEarly: (sessionType: "General" | "Interview", wordOrQuestion: string, language: SessionLanguage, difficulty: SessionDifficulty, thinkSeconds: number, speakSeconds: number, modeName: string) => Promise<void>;
  saveSessionAndGetAdvice: (sessionToSave: Session, options: { loginIfUnauthenticated: boolean; showToast: boolean }) => Promise<boolean>;
  loadRemoteSessions: () => Promise<void>;
  handleDeleteHistorySession: (id: string) => Promise<void>;
  handleReplayHistoryAudio: (historySession: Session) => Promise<void>;

  // Transcription polling
  transcriptionPolling: ReturnType<typeof useTranscriptionPolling>;

  // Reset helpers
  resetSaveState: () => void;
  setSavedServerSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setSavedSpeechAnalysis: React.Dispatch<React.SetStateAction<unknown>>;
  setEarlySaveStatus: React.Dispatch<React.SetStateAction<"idle" | "saving" | "saved" | "failed">>;
  setSavedSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setSaveAttemptedSessionId: React.Dispatch<React.SetStateAction<string | null>>;
}

const SessionCtx = createContext<SessionContextValue | null>(null);

export function useSessionContext() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSessionContext must be used within SessionProvider");
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const app = useAppContext();
  const sessionHook = useSession();

  const [isSaving, setIsSaving] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [savedServerSessionId, setSavedServerSessionId] = useState<string | null>(null);
  const [savedSpeechAnalysis, setSavedSpeechAnalysis] = useState<unknown>(null);
  const [saveAttemptedSessionId, setSaveAttemptedSessionId] = useState<string | null>(null);
  const [earlySaveStatus, setEarlySaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [remoteSessions, setRemoteSessions] = useState<Session[] | null>(null);

  // Transcription polling — starts when we have a server session ID and are on PLAYBACK or later
  const transcriptionPolling = useTranscriptionPolling(
    savedServerSessionId,
    earlySaveStatus === "saved" && (app.screen === "PLAYBACK" || app.screen === "REFLECT" || app.screen === "SCORE_SUMMARY"),
  );

  // Remote sessions
  const loadRemoteSessions = useCallback(async () => {
    if (!app.isAuthenticated) return;
    try {
      const response = await apiClient("/api/sessions", { method: "GET" });
      if (!response.ok) throw new Error(`Failed to load remote sessions (${response.status})`);
      const payload = await response.json();
      if (!Array.isArray(payload)) { setRemoteSessions([]); return; }
      const mapped = (payload as Array<Session & { manualScore?: number; aiScore?: number }>).map((s) => ({
        ...s,
        language: s.language ?? DEFAULT_LANGUAGE,
        difficulty: s.difficulty ?? DEFAULT_DIFFICULTY,
        overallScore: s.overallScore ?? s.manualScore ?? s.aiScore,
      }));
      setRemoteSessions(mapped);
    } catch (error) {
      console.error("Failed to load remote sessions:", error);
    }
  }, [app.isAuthenticated]);

  useEffect(() => {
    if (!app.isAuthenticated) setRemoteSessions(null);
  }, [app.isAuthenticated]);

  useEffect(() => {
    if (app.screen !== "HISTORY" || !app.isAuthenticated) return;
    void loadRemoteSessions();
  }, [app.screen, app.isAuthenticated, loadRemoteSessions]);

  const historySessions = useMemo(() => {
    if (!app.isAuthenticated) return sessionHook.sessions;
    return remoteSessions ?? [];
  }, [app.isAuthenticated, remoteSessions, sessionHook.sessions]);

  // Early save
  const saveSessionEarly = useCallback(async (
    sessionType: "General" | "Interview",
    wordOrQuestion: string,
    language: SessionLanguage,
    difficulty: SessionDifficulty,
    thinkSeconds: number,
    speakSeconds: number,
    modeName: string,
  ) => {
    if (!app.isAuthenticated) return;
    if (earlySaveStatus === "saving" || earlySaveStatus === "saved") return;

    setEarlySaveStatus("saving");
    try {
      const currentAudio = sessionHook.audio;
      if (!currentAudio?.available || !currentAudio.fileUri || !currentAudio.fileUri.startsWith("blob:")) {
        setEarlySaveStatus("failed");
        return;
      }

      const blobResponse = await fetch(currentAudio.fileUri);
      if (!blobResponse.ok) throw new Error("Failed to read audio blob");

      const blob = await blobResponse.blob();
      if (blob.size <= 0) throw new Error("Audio blob is empty");

      const uploadFormat = resolveUploadFormat(blob.type);
      if (!uploadFormat) throw new Error(`Unsupported audio format: ${blob.type}`);

      const audioFile = new File(
        [blob],
        `session-${sessionHook.session?.id ?? Date.now()}${uploadFormat.extension}`,
        { type: uploadFormat.contentType }
      );

      const sessionData: Record<string, unknown> = {
        id: sessionHook.session?.id,
        createdAt: sessionHook.session?.createdAt ?? new Date().toISOString(),
        mode: sessionHook.session?.mode ?? modeName,
        type: sessionType,
        language,
        difficulty,
        word: wordOrQuestion,
        thinkSeconds,
        speakSeconds,
        status: "COMPLETED",
      };

      const result = await recordSession(audioFile, sessionData);
      const serverId = (result as { id?: string }).id;
      if (serverId) {
        setSavedServerSessionId(serverId);
        setEarlySaveStatus("saved");

        // Fire-and-forget: trigger transcription in the background
        // This is decoupled from session creation so a Deepgram failure doesn't block saving
        triggerTranscription(serverId).catch((err) => {
          console.warn("Background transcription trigger failed (will retry via polling):", err);
        });
      } else {
        setEarlySaveStatus("failed");
      }
    } catch (error) {
      console.error("Early save failed (will retry at score):", error);
      setEarlySaveStatus("failed");
    }
  }, [app.isAuthenticated, earlySaveStatus, sessionHook.audio, sessionHook.session]);

  // Full save
  const saveSessionAndGetAdvice = useCallback(async (
    sessionToSave: Session,
    options: { loginIfUnauthenticated: boolean; showToast: boolean }
  ) => {
    const { loginIfUnauthenticated, showToast } = options;

    if (!app.isAuthenticated) {
      if (loginIfUnauthenticated) {
        sessionStorage.setItem("pending_session", JSON.stringify(sessionToSave));
        app.login(window.location.pathname);
      }
      return false;
    }

    setSaveAttemptedSessionId(sessionToSave.id);
    setIsSaving(true);

    try {
      // Fast path: early save already uploaded audio + created session → just PUT ratings
      if (earlySaveStatus === "saved" && savedServerSessionId) {
        const updateBody: Record<string, unknown> = {
          status: "Completed",
          completedAt: sessionToSave.completedAt ?? new Date().toISOString(),
          overallScore: sessionToSave.overallScore,
          notes: sessionToSave.notes,
        };
        if (sessionToSave.type === "Interview" && sessionToSave.interviewRatings) {
          updateBody.interviewRatings = sessionToSave.interviewRatings;
        } else if (sessionToSave.ratings) {
          updateBody.ratings = sessionToSave.ratings;
        }

        const result = await updateSession(savedServerSessionId, updateBody);
        const advice = extractAdviceFromSaveResponse(result) ?? buildFallbackAdvice(sessionToSave);
        const persistedSession: Session = advice ? { ...sessionToSave, advice } : sessionToSave;

        setSavedSpeechAnalysis((result as { speechAnalysis?: unknown })?.speechAnalysis ?? null);
        sessionHook.restoreSession(persistedSession);
        setSavedSessionId(sessionToSave.id);
        sessionStorage.removeItem("pending_session");

        if (showToast) {
          toast.success("Session saved.");
          if (advice) toast.info(advice, { duration: 10000 });
        }
        return true;
      }

      // Fallback: full save (no early save, or early save failed)
      let uploadReadySession = sessionToSave;
      const sessionAudio = sessionToSave.audio;

      if (
        sessionAudio?.available &&
        sessionAudio.fileUri &&
        sessionAudio.fileUri.startsWith("blob:") &&
        !sessionAudio.objectKey
      ) {
        try {
          const blobResponse = await fetch(sessionAudio.fileUri);
          if (!blobResponse.ok) throw new Error(`Failed to read local audio blob (${blobResponse.status})`);
          const blob = await blobResponse.blob();
          if (blob.size <= 0) throw new Error("Recorded blob is empty");

          const uploadFormat = resolveUploadFormat(blob.type);
          if (!uploadFormat) throw new Error(`Unsupported recorded audio format: ${blob.type || "unknown"}`);

          const uploadFile = new File([blob], `session-${sessionToSave.id}${uploadFormat.extension}`, {
            type: uploadFormat.contentType,
          });

          const formData = new FormData();
          formData.append("file", uploadFile);

          const uploadRes = await apiClient("/api/audio/upload", { method: "POST", body: formData });
          if (!uploadRes.ok) throw new Error(`Audio upload failed (${uploadRes.status})`);

          const uploadData = (await uploadRes.json()) as AudioUploadResponse;
          uploadReadySession = {
            ...sessionToSave,
            audio: {
              ...sessionAudio,
              objectKey: uploadData.objectKey,
              bucketName: uploadData.bucketName,
              region: uploadData.region,
              uploadedAt: new Date().toISOString(),
            },
          };

          sessionHook.restoreSession(uploadReadySession);
        } catch (uploadError) {
          console.error("Audio upload error:", uploadError);
          if (showToast) toast.warning("Session saved, but audio upload failed.");
        }
      }

      const { transcript: _clientTranscript, ...sessionWithoutTranscript } = uploadReadySession;
      const saveBody = sessionWithoutTranscript;

      let saveRes = await apiClient("/api/sessions", { method: "POST", body: JSON.stringify(saveBody) });
      if (saveRes.status === 404 || saveRes.status === 405) {
        saveRes = await apiClient("/api/sessions/record", { method: "POST", body: JSON.stringify(saveBody) });
      }

      if (!saveRes.ok) {
        if (saveRes.status === 401 && loginIfUnauthenticated) {
          sessionStorage.setItem("pending_session", JSON.stringify(uploadReadySession));
          app.login(window.location.pathname);
          return false;
        }
        throw new Error(`Failed to save session (${saveRes.status})`);
      }

      const saveData = await saveRes.json();
      const advice = extractAdviceFromSaveResponse(saveData) ?? buildFallbackAdvice(uploadReadySession);
      const persistedSession: Session = advice ? { ...uploadReadySession, advice } : uploadReadySession;

      const serverId = (saveData as { id?: string })?.id ?? sessionToSave.id;
      setSavedServerSessionId(serverId);
      setSavedSpeechAnalysis((saveData as { speechAnalysis?: unknown })?.speechAnalysis ?? null);

      sessionHook.restoreSession(persistedSession);
      setSavedSessionId(sessionToSave.id);
      sessionStorage.removeItem("pending_session");

      if (showToast) {
        toast.success("Session saved.");
        if (advice) toast.info(advice, { duration: 10000 });
      }
      return true;
    } catch (error) {
      if (showToast) toast.error("Failed to save session. Please try again.");
      console.error("Save error:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [app.isAuthenticated, app.login, sessionHook.restoreSession, earlySaveStatus, savedServerSessionId]);

  // Auto-save on SCORE_SUMMARY
  useEffect(() => {
    if (app.screen !== "SCORE_SUMMARY" || !app.isAuthenticated || !sessionHook.session || sessionHook.session.status !== "COMPLETED") return;
    if (savedSessionId === sessionHook.session.id || saveAttemptedSessionId === sessionHook.session.id || isSaving) return;
    void saveSessionAndGetAdvice(sessionHook.session, { loginIfUnauthenticated: false, showToast: false });
  }, [app.screen, app.isAuthenticated, sessionHook.session, savedSessionId, saveAttemptedSessionId, isSaving, saveSessionAndGetAdvice]);

  // Delete
  const handleDeleteHistorySession = useCallback(async (id: string) => {
    try {
      if (app.isAuthenticated) {
        const response = await apiClient(`/api/sessions/${id}`, { method: "DELETE" });
        if (!response.ok && response.status !== 404) throw new Error(`Failed to delete session (${response.status})`);
        setRemoteSessions((prev) => prev?.filter((s) => s.id !== id) ?? prev);
      }
      sessionHook.deleteHistorySession(id);
      if (savedSessionId === id) setSavedSessionId(null);
      if (saveAttemptedSessionId === id) setSaveAttemptedSessionId(null);
      toast.success("Session removed from history.");
    } catch (error) {
      console.error("Delete session error:", error);
      toast.error("Failed to delete session.");
    }
  }, [sessionHook.deleteHistorySession, app.isAuthenticated, savedSessionId, saveAttemptedSessionId]);

  // Replay history audio
  const handleReplayHistoryAudio = useCallback(async (historySession: Session) => {
    try {
      let audioUrl = historySession.audio?.fileUri;
      if (!audioUrl) {
        if (!historySession.audio?.objectKey) { toast.error("No audio available for this session."); return; }
        const response = await apiClient(`/api/sessions/${historySession.id}/audio-url`, { method: "GET" });
        if (!response.ok) throw new Error(`Failed to get audio URL (${response.status})`);
        const payload = (await response.json()) as { url?: unknown };
        if (typeof payload.url !== "string" || payload.url.trim().length === 0) throw new Error("Audio URL is missing in response");
        audioUrl = payload.url;
      }
      const audioInstance = new Audio(audioUrl);
      await audioInstance.play();
    } catch (error) {
      console.error("History audio replay error:", error);
      toast.error("Unable to replay this audio file.");
    }
  }, []);

  // Reset
  const resetSaveState = useCallback(() => {
    setSavedSessionId(null);
    setSaveAttemptedSessionId(null);
    setSavedServerSessionId(null);
    setSavedSpeechAnalysis(null);
    setEarlySaveStatus("idle");
  }, []);

  const value = useMemo<SessionContextValue>(() => ({
    ...sessionHook,
    isSaving, savedSessionId, savedServerSessionId, savedSpeechAnalysis, earlySaveStatus,
    remoteSessions, historySessions,
    transcriptionPolling,
    saveSessionEarly, saveSessionAndGetAdvice, loadRemoteSessions,
    handleDeleteHistorySession, handleReplayHistoryAudio,
    resetSaveState,
    setSavedServerSessionId, setSavedSpeechAnalysis, setEarlySaveStatus, setSavedSessionId, setSaveAttemptedSessionId,
  }), [
    sessionHook,
    isSaving, savedSessionId, savedServerSessionId, savedSpeechAnalysis, earlySaveStatus,
    remoteSessions, historySessions,
    transcriptionPolling,
    saveSessionEarly, saveSessionAndGetAdvice, loadRemoteSessions,
    handleDeleteHistorySession, handleReplayHistoryAudio,
    resetSaveState,
  ]);

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
