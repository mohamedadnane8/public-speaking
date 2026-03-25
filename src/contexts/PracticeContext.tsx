import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import i18n from "../i18n";
import { useTimer } from "../hooks/useTimer";
import { useSoundSystem } from "../hooks/useSoundSystem";
import { useAppContext } from "./AppContext";
import { useSessionContext } from "./SessionContext";
import { getModeConfig, getNextMode, getPrevMode } from "../lib/modes";
import { fetchRandomWordFromBackend } from "../lib/words";
import { calculateOverallScore, hasAllRatings } from "../lib/scoring";
import type { SessionRatings, RatingValue, SessionLanguage, SessionDifficulty } from "../types/session";

const isLocalhost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

const isRecordingSupported =
  typeof window !== "undefined" &&
  window.isSecureContext &&
  typeof window.MediaRecorder !== "undefined" &&
  typeof navigator !== "undefined" &&
  typeof navigator.mediaDevices !== "undefined" &&
  typeof navigator.mediaDevices.getUserMedia === "function";

const defaultMode = isLocalhost ? "MANUAL" : "EXPLANATION";
const defaultThinkSeconds = isLocalhost ? 5 : 30;
const defaultSpeakSeconds = isLocalhost ? 5 : 60;
const DEFAULT_LANGUAGE: SessionLanguage = "EN";
const DEFAULT_DIFFICULTY: SessionDifficulty = "MEDIUM";
const LANGUAGE_STORAGE_KEY = "impromptu_language";
const DIFFICULTY_STORAGE_KEY = "impromptu_difficulty";

const DIFFICULTY_TIME_MULTIPLIER: Record<SessionDifficulty, number> = {
  EASY: 1.25,
  MEDIUM: 1,
  HARD: 0.8,
};

function getStoredLanguage(): SessionLanguage {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return value === "EN" || value === "FR" || value === "AR" ? value : DEFAULT_LANGUAGE;
}

function getStoredDifficulty(): SessionDifficulty {
  if (typeof window === "undefined") return DEFAULT_DIFFICULTY;
  const value = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
  return value === "EASY" || value === "MEDIUM" || value === "HARD" ? value : DEFAULT_DIFFICULTY;
}

// ─── Types ──────────────────────────────────────────────────────

type ModeConfig = ReturnType<typeof getModeConfig>;

interface PracticeContextValue {
  // Mode
  modeConfig: ModeConfig;
  manualThinkSeconds: number;
  manualSpeakSeconds: number;
  selectedLanguage: SessionLanguage;
  selectedDifficulty: SessionDifficulty;
  effectiveThinkSeconds: number;
  effectiveSpeakSeconds: number;
  isRecordingSupported: boolean;

  // Word
  currentWord: string;
  spinKey: number;
  isRevealing: boolean;
  showWordActions: boolean;

  // Recording permission
  hasRecordingPermission: boolean | null;
  isRequestingPermission: boolean;

  // Ratings
  ratings: Partial<SessionRatings>;
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;

  // Timers
  thinkTimer: ReturnType<typeof useTimer>;
  speakTimer: ReturnType<typeof useTimer>;

  // Sound
  playTock: () => void;

  // Handlers
  handleModeCycle: (direction?: 1 | -1) => void;
  handleLanguageChange: (language: SessionLanguage) => void;
  handleDifficultyChange: (difficulty: SessionDifficulty) => void;
  handleManualTimeChange: (type: "think" | "speak", delta: number) => void;
  handleRequestPermission: () => Promise<void>;
  handleSpin: () => Promise<void>;
  handleRevealComplete: () => void;
  handleStartSession: () => void;
  handleRateChange: (criteria: keyof SessionRatings, value: RatingValue) => void;
  handleDoneRating: () => void;
  handleCancel: (reason: "USER_BACK" | "APP_BACKGROUND" | "ERROR" | "PERMISSION_DENIED" | "AUDIO_INTERRUPTED") => void;
  handleNewSession: () => void;
  transitionToSpeak: () => Promise<void>;
  transitionToPlayback: () => Promise<void>;
}

const PracticeCtx = createContext<PracticeContextValue | null>(null);

export function usePracticeContext() {
  const ctx = useContext(PracticeCtx);
  if (!ctx) throw new Error("usePracticeContext must be used within PracticeProvider");
  return ctx;
}

export function PracticeProvider({ children }: { children: ReactNode }) {
  const app = useAppContext();
  const sess = useSessionContext();

  // Sound
  const {
    init,
    playWhirr,
    playTick,
    playTock,
    playThum,
    playAmbientStart,
    playToneShift,
    playCountdownTick,
  } = useSoundSystem();

  // Mode config
  const [modeConfig, setModeConfig] = useState(getModeConfig(defaultMode));
  const [manualThinkSeconds, setManualThinkSeconds] = useState(defaultThinkSeconds);
  const [manualSpeakSeconds, setManualSpeakSeconds] = useState(defaultSpeakSeconds);
  const [selectedLanguage, setSelectedLanguage] = useState<SessionLanguage>(() => getStoredLanguage());
  const [selectedDifficulty, setSelectedDifficulty] = useState<SessionDifficulty>(() => getStoredDifficulty());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, selectedLanguage);
  }, [selectedLanguage]);

  // Sync language selection with i18n and HTML attributes
  useEffect(() => {
    const langMap: Record<SessionLanguage, string> = { EN: "en", FR: "fr", AR: "ar" };
    const i18nLang = langMap[selectedLanguage] ?? "en";
    if (i18n.language !== i18nLang) {
      i18n.changeLanguage(i18nLang);
    }
    document.documentElement.lang = i18nLang;
    document.documentElement.dir = selectedLanguage === "AR" ? "rtl" : "ltr";
  }, [selectedLanguage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, selectedDifficulty);
  }, [selectedDifficulty]);

  const effectiveThinkSeconds = modeConfig.name === "MANUAL"
    ? manualThinkSeconds
    : Math.max(5, Math.round((modeConfig.thinkSeconds * DIFFICULTY_TIME_MULTIPLIER[selectedDifficulty]) / 5) * 5);

  const effectiveSpeakSeconds = modeConfig.name === "MANUAL"
    ? manualSpeakSeconds
    : Math.max(5, Math.round((modeConfig.speakSeconds * DIFFICULTY_TIME_MULTIPLIER[selectedDifficulty]) / 5) * 5);

  // Word
  const [currentWord, setCurrentWord] = useState("");
  const [spinKey, setSpinKey] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showWordActions, setShowWordActions] = useState(false);

  // Recording permission
  const [hasRecordingPermission, setHasRecordingPermission] = useState<boolean | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Ratings
  const [ratings, setRatings] = useState<Partial<SessionRatings>>({});
  const [notes, setNotes] = useState("");

  // Tick tracking
  const lastTickPlayedRef = useRef<number>(-1);

  // Timers
  const transitionToSpeakRef = useRef<() => Promise<void>>(undefined);
  const transitionToPlaybackRef = useRef<() => Promise<void>>(undefined);

  const thinkTimer = useTimer(
    effectiveThinkSeconds,
    () => { transitionToSpeakRef.current?.(); },
    (secondsLeft) => {
      if (secondsLeft <= 5 && secondsLeft > 0 && secondsLeft !== lastTickPlayedRef.current) {
        playCountdownTick();
        lastTickPlayedRef.current = secondsLeft;
      }
    }
  );

  const speakTimer = useTimer(
    effectiveSpeakSeconds,
    () => { transitionToPlaybackRef.current?.(); },
    (secondsLeft) => {
      if (secondsLeft <= 5 && secondsLeft > 0 && secondsLeft !== lastTickPlayedRef.current) {
        playCountdownTick();
        lastTickPlayedRef.current = secondsLeft;
      }
    }
  );

  // Reset tick on screen change
  useEffect(() => {
    if (app.screen === "THINK" || app.screen === "SPEAK") {
      lastTickPlayedRef.current = -1;
    }
  }, [app.screen]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      thinkTimer.cleanup();
      speakTimer.cleanup();
    };
  }, []);

  // Transitions
  const transitionToSpeak = useCallback(async () => {
    thinkTimer.pause();
    app.setScreen("SPEAK");
    lastTickPlayedRef.current = -1;
    speakTimer.reset(effectiveSpeakSeconds);
    playToneShift();
    await sess.startRecording();
    speakTimer.start();
  }, [effectiveSpeakSeconds, thinkTimer, speakTimer, playToneShift, sess.startRecording]);

  const transitionToPlayback = useCallback(async () => {
    speakTimer.pause();
    // Keep recording a tiny tail to avoid clipping the end of speech.
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    await sess.stopRecording();
    if (sess.audio?.durationMs) {
      app.setFallbackDuration(sess.audio.durationMs);
    }
    app.setScreen("PLAYBACK");
  }, [speakTimer, sess.stopRecording, app.setScreen, app.setFallbackDuration, sess.audio?.durationMs]);

  // Keep refs up to date for timer callbacks
  transitionToSpeakRef.current = transitionToSpeak;
  transitionToPlaybackRef.current = transitionToPlayback;

  // Trigger early save when entering PLAYBACK
  useEffect(() => {
    if (app.screen !== "PLAYBACK") return;
    if (sess.earlySaveStatus !== "idle") return;
    if (!sess.audio?.available || !sess.audio.fileUri || !sess.audio.fileUri.startsWith("blob:")) return;
    if (!app.isAuthenticated) return;

    void sess.saveSessionEarly(
      "General",
      currentWord,
      selectedLanguage,
      selectedDifficulty,
      effectiveThinkSeconds,
      effectiveSpeakSeconds,
      modeConfig.name,
    );
  }, [app.screen, sess.audio, sess.earlySaveStatus, app.isAuthenticated]);

  // App backgrounding
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (app.screen === "THINK" || app.screen === "SPEAK") {
          if (app.screen === "SPEAK") {
            toast.warning(i18n.t("toast.recordingStopped"));
          }
          handleCancel("APP_BACKGROUND");
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [app.screen]);

  // Pending session check
  useEffect(() => {
    const pendingSession = sessionStorage.getItem("pending_session");
    if (pendingSession && app.screen === "HOME" && !app.isAuthSuccessPage && !app.isAuthErrorPage) {
      const parsed = JSON.parse(pendingSession);
      if (parsed?.status === "COMPLETED") {
        toast.info(i18n.t("toast.sessionReady"));
      }
    }
  }, [app.screen, app.isAuthSuccessPage, app.isAuthErrorPage]);

  // ─── Handlers ─────────────────────────────────────────────────

  const resetState = useCallback(() => {
    if (app.audioRef.current) {
      app.audioRef.current.pause();
      app.audioRef.current = null;
    }
    app.audioSrcRef.current = null;
    sess.resetRecording();
    setRatings({});
    setNotes("");
    app.setIsPlaying(false);
    app.setCurrentTime(0);
    app.setDuration(0);
    sess.resetSaveState();
  }, [app, sess]);

  const handleCancel = useCallback((reason: "USER_BACK" | "APP_BACKGROUND" | "ERROR" | "PERMISSION_DENIED" | "AUDIO_INTERRUPTED") => {
    thinkTimer.pause();
    speakTimer.pause();
    if (sess.isRecording) sess.stopRecording();
    sess.cancelSession(reason);
    resetState();
    app.setScreen("HOME");
  }, [thinkTimer, speakTimer, sess, resetState, app.setScreen]);

  const handleModeCycle = (direction: 1 | -1 = 1) => {
    const next = direction === 1 ? getNextMode(modeConfig.name) : getPrevMode(modeConfig.name);
    setModeConfig(getModeConfig(next));
  };

  const handleLanguageChange = (language: SessionLanguage) => {
    setSelectedLanguage(language);
    sess.resetUsedWords();
  };

  const handleDifficultyChange = (difficulty: SessionDifficulty) => {
    setSelectedDifficulty(difficulty);
    sess.resetUsedWords();
  };

  const handleManualTimeChange = (type: "think" | "speak", delta: number) => {
    if (type === "think") {
      setManualThinkSeconds((prev) => Math.max(5, Math.min(300, prev + delta)));
    } else {
      setManualSpeakSeconds((prev) => Math.max(5, Math.min(300, prev + delta)));
    }
  };

  const handleRequestPermission = async () => {
    if (!isRecordingSupported) return;
    setIsRequestingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasRecordingPermission(true);
    } catch {
      setHasRecordingPermission(false);
    }
    setIsRequestingPermission(false);
  };

  const handleSpin = async () => {
    init();
    let newWord = "";
    try {
      newWord = await fetchRandomWordFromBackend({
        language: selectedLanguage,
        difficulty: selectedDifficulty,
        excludedWords: sess.usedWords,
      });
    } catch (error) {
      console.error("Failed to fetch random word from backend:", error);
      toast.error(i18n.t("toast.unableToFetchWord"));
      return;
    }

    setCurrentWord(newWord);
    sess.addUsedWord(newWord);
    setSpinKey((k) => k + 1);
    app.setScreen("WORD_REVEAL");
    setIsRevealing(true);
    setShowWordActions(false);

    playWhirr();
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      playTick();
      tickCount++;
      if (tickCount > 25) clearInterval(tickInterval);
    }, 60);
  };

  const handleRevealComplete = () => {
    setIsRevealing(false);
    playThum();
    setTimeout(() => setShowWordActions(true), 400);
  };

  const handleStartSession = () => {
    sess.createSession(modeConfig.name, selectedLanguage, selectedDifficulty, currentWord, effectiveThinkSeconds, effectiveSpeakSeconds);
    app.setScreen("THINK");
    lastTickPlayedRef.current = -1;
    thinkTimer.reset(effectiveThinkSeconds);
    speakTimer.reset(effectiveSpeakSeconds);
    playAmbientStart();
    setTimeout(() => thinkTimer.start(), 500);
  };

  const handleRateChange = (criteria: keyof SessionRatings, value: RatingValue) => {
    setRatings((prev) => ({ ...prev, [criteria]: value }));
  };

  const handleDoneRating = () => {
    if (!hasAllRatings(ratings)) return;
    const overallScore = calculateOverallScore(ratings);
    const transcript = sess.transcriptionPolling.transcript ?? undefined;
    sess.completeSession(ratings, overallScore, notes, transcript);
    sess.setSavedSessionId(null);
    sess.setSaveAttemptedSessionId(null);
    app.setScreen("SCORE_SUMMARY");
  };

  const handleNewSession = () => {
    resetState();
    sess.resetUsedWords();
    setHasRecordingPermission(null);
    app.setScreen("HOME");
  };

  const value = useMemo<PracticeContextValue>(() => ({
    modeConfig, manualThinkSeconds, manualSpeakSeconds, selectedLanguage, selectedDifficulty,
    effectiveThinkSeconds, effectiveSpeakSeconds, isRecordingSupported,
    currentWord, spinKey, isRevealing, showWordActions,
    hasRecordingPermission, isRequestingPermission,
    ratings, notes, setNotes,
    thinkTimer, speakTimer,
    playTock,
    handleModeCycle, handleLanguageChange, handleDifficultyChange, handleManualTimeChange,
    handleRequestPermission, handleSpin, handleRevealComplete, handleStartSession,
    handleRateChange, handleDoneRating, handleCancel, handleNewSession,
    transitionToSpeak, transitionToPlayback,
  }), [
    modeConfig, manualThinkSeconds, manualSpeakSeconds, selectedLanguage, selectedDifficulty,
    effectiveThinkSeconds, effectiveSpeakSeconds,
    currentWord, spinKey, isRevealing, showWordActions,
    hasRecordingPermission, isRequestingPermission,
    ratings, notes,
    thinkTimer, speakTimer,
    playTock,
    handleCancel, handleNewSession, transitionToSpeak, transitionToPlayback,
    handleSpin, handleRevealComplete, handleStartSession, handleDoneRating,
    handleRequestPermission,
  ]);

  return <PracticeCtx.Provider value={value}>{children}</PracticeCtx.Provider>;
}
