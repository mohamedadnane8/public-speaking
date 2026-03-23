import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { useTimer } from "./hooks/useTimer";
import { useSoundSystem } from "./hooks/useSoundSystem";
import { useSession } from "./hooks/useSession";
import { useTranscription, isTranscriptionSupported } from "./hooks/useTranscription";
import { useAuth } from "./hooks/useAuth";
import { apiClient } from "./lib/apiClient";
import { getModeConfig, getNextMode } from "./lib/modes";
import { fetchRandomWordFromBackend } from "./lib/words";
import { calculateOverallScore, hasAllRatings } from "./lib/scoring";
import type {
  Screen,
  Session,
  SessionRatings,
  RatingValue,
  SessionLanguage,
  SessionDifficulty,
} from "./types/session";

// Screens
import { HomeScreen } from "./screens/HomeScreen";
import { WordRevealScreen } from "./screens/WordRevealScreen";
import { ThinkScreen } from "./screens/ThinkScreen";
import { SpeakScreen } from "./screens/SpeakScreen";
import { PlaybackScreen } from "./screens/PlaybackScreen";
import { ReflectScreen } from "./screens/ReflectScreen";
import { ScoreSummaryScreen } from "./screens/ScoreSummaryScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { FeatureRequestScreen } from "./screens/FeatureRequestScreen";
import { AuthSuccessScreen } from "./screens/AuthSuccessScreen";
import { AuthErrorScreen } from "./screens/AuthErrorScreen";

// Interview screens
import { InterviewHomeScreen } from "./screens/InterviewHomeScreen";
import { InterviewQuestionScreen } from "./screens/InterviewQuestionScreen";
import { InterviewThinkScreen } from "./screens/InterviewThinkScreen";
import { InterviewSpeakScreen } from "./screens/InterviewSpeakScreen";
import { InterviewPlaybackScreen } from "./screens/InterviewPlaybackScreen";

// Components
import { TopNavbar } from "./components/TopNavbar";
import type { NavSection } from "./components/TopNavbar";

// Interview hook
import { useInterview } from "./hooks/useInterview";

import "./App.css";

// Check if recording is supported
const isRecordingSupported =
  typeof window !== "undefined" &&
  window.isSecureContext &&
  typeof window.MediaRecorder !== "undefined" &&
  typeof navigator !== "undefined" &&
  typeof navigator.mediaDevices !== "undefined" &&
  typeof navigator.mediaDevices.getUserMedia === "function";

const isLocalhost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

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

type AudioUploadResponse = {
  objectKey: string;
  bucketName: string;
  region: string;
  fileSize: number;
  contentType: string;
};

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

  const tieCandidates = scored
    .sort((a, b) => a[0].localeCompare(b[0]));

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
  if (typeof direct === "string" && direct.trim().length > 0) {
    return direct.trim();
  }

  const nested = (payload as { session?: { advice?: unknown } }).session?.advice;
  if (typeof nested === "string" && nested.trim().length > 0) {
    return nested.trim();
  }

  return null;
}

function resolveUploadFormat(contentType?: string): { extension: string; contentType: string } | null {
  const normalized = (contentType || "").toLowerCase();
  if (normalized.includes("mpeg") || normalized.includes("mp3")) {
    return { extension: ".mp3", contentType: "audio/mpeg" };
  }
  if (normalized.includes("wav")) {
    return { extension: ".wav", contentType: "audio/wav" };
  }
  if (normalized.includes("mp4") || normalized.includes("m4a") || normalized.includes("aac")) {
    return { extension: ".m4a", contentType: "audio/mp4" };
  }
  if (normalized.includes("webm")) {
    return { extension: ".webm", contentType: "audio/webm" };
  }
  if (normalized.includes("ogg") || normalized.includes("opus")) {
    return { extension: ".ogg", contentType: "audio/ogg" };
  }
  if (normalized.length === 0) {
    // Most browsers default to webm when MediaRecorder does not expose explicit type.
    return { extension: ".webm", contentType: "audio/webm" };
  }

  // Unsupported MIME type from recorder.
  return null;
}

function getStoredLanguage(): SessionLanguage {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return value === "EN" || value === "FR" || value === "AR" ? value : DEFAULT_LANGUAGE;
}

function getStoredDifficulty(): SessionDifficulty {
  if (typeof window === "undefined") return DEFAULT_DIFFICULTY;
  const value = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
  return value === "EASY" || value === "MEDIUM" || value === "HARD"
    ? value
    : DEFAULT_DIFFICULTY;
}

function App() {
  // Screen state
  const [screen, setScreen] = useState<Screen>("HOME");

  // Parse URL for auth callback parameters
  const urlParams = new URLSearchParams(window.location.search);
  const authError = urlParams.get("error");
  const authSuccess = urlParams.get("auth") === "success";
  
  // Determine if we're on an auth callback page
  const isAuthSuccessPage = authSuccess || window.location.pathname === "/auth/success";
  const isAuthErrorPage = authError !== null || window.location.pathname === "/auth/error";
  
  // Handle clearing URL parameters after auth
  const clearAuthParams = useCallback(() => {
    // Remove auth query params from URL without reloading
    const newUrl = window.location.pathname.replace(/\/auth\/(success|error)/, "") || "/";
    window.history.replaceState({}, document.title, newUrl);
  }, []);

  // Check for pending session after OAuth redirect
  useEffect(() => {
    const pendingSession = sessionStorage.getItem("pending_session");
    if (pendingSession && screen === "HOME" && !isAuthSuccessPage && !isAuthErrorPage) {
      // If we have a pending session and just returned to home after auth,
      // we might want to restore it or notify the user
      const parsed = JSON.parse(pendingSession);
      if (parsed?.status === "COMPLETED") {
        toast.info("Your session is ready to be saved!");
      }
    }
  }, [screen, isAuthSuccessPage, isAuthErrorPage]);

  // Mode configuration
  const [modeConfig, setModeConfig] = useState(getModeConfig(defaultMode));
  const [manualThinkSeconds, setManualThinkSeconds] = useState(defaultThinkSeconds);
  const [manualSpeakSeconds, setManualSpeakSeconds] = useState(defaultSpeakSeconds);
  const [selectedLanguage, setSelectedLanguage] = useState<SessionLanguage>(() => getStoredLanguage());
  const [selectedDifficulty, setSelectedDifficulty] = useState<SessionDifficulty>(() => getStoredDifficulty());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, selectedDifficulty);
  }, [selectedDifficulty]);

  // Word state
  const [currentWord, setCurrentWord] = useState("");
  const [spinKey, setSpinKey] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showWordActions, setShowWordActions] = useState(false);

  // Recording permission state
  const [hasRecordingPermission, setHasRecordingPermission] = useState<boolean | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Reflect state
  const [ratings, setRatings] = useState<Partial<SessionRatings>>({});
  const [notes, setNotes] = useState("");

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Save & advice state
  const [isSaving, setIsSaving] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [saveAttemptedSessionId, setSaveAttemptedSessionId] = useState<string | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const [remoteSessions, setRemoteSessions] = useState<Session[] | null>(null);
  
  // Auth hook
  const { user, isAuthenticated, isLoading: isAuthLoading, login, logout } = useAuth();

  // Hooks
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

  const {
    session,
    sessions,
    audio,
    isRecording,
    usedWords,
    createSession,
    completeSession,
    cancelSession,
    startRecording,
    stopRecording,
    resetRecording,
    restoreSession,
    deleteHistorySession,
    addUsedWord,
    resetUsedWords,
  } = useSession();

  const lastTickPlayedRef = useRef<number>(-1);

  // Transcription hook
  const {
    transcript,
    isTranscribing,
    startTranscription,
    stopTranscription,
    resetTranscription,
  } = useTranscription();

  // Interview hook
  const interview = useInterview();
  const [isCheckingResume, setIsCheckingResume] = useState(false);

  // Interview timers
  const interviewThinkTimer = useTimer(
    interview.currentQuestion?.thinkingSeconds ?? 30,
    () => transitionToInterviewSpeak(),
    (secondsLeft) => {
      if (secondsLeft <= 5 && secondsLeft > 0 && secondsLeft !== lastTickPlayedRef.current) {
        playCountdownTick();
        lastTickPlayedRef.current = secondsLeft;
      }
    }
  );

  const interviewSpeakTimer = useTimer(
    interview.currentQuestion?.answeringSeconds ?? 60,
    () => transitionToInterviewPlayback(),
    (secondsLeft) => {
      if (secondsLeft <= 5 && secondsLeft > 0 && secondsLeft !== lastTickPlayedRef.current) {
        playCountdownTick();
        lastTickPlayedRef.current = secondsLeft;
      }
    }
  );

  // Derived section for navbar
  const section: NavSection = useMemo(() => {
    if (screen.startsWith("INTERVIEW_")) return "INTERVIEWS";
    if (screen === "HISTORY") return "HISTORY";
    return "GENERAL_PRACTICE";
  }, [screen]);

  // Navbar visibility: hidden during active practice flows
  const showNavbar = ![
    "THINK", "SPEAK", "PLAYBACK", "REFLECT", "SCORE_SUMMARY",
    "INTERVIEW_THINK", "INTERVIEW_SPEAK", "INTERVIEW_PLAYBACK",
    "INTERVIEW_REFLECT", "INTERVIEW_SCORE",
  ].includes(screen) && !isAuthSuccessPage && !isAuthErrorPage;

  // Effective timings
  const effectiveThinkSeconds = modeConfig.name === "MANUAL"
    ? manualThinkSeconds
    : Math.max(5, Math.round((modeConfig.thinkSeconds * DIFFICULTY_TIME_MULTIPLIER[selectedDifficulty]) / 5) * 5);

  const effectiveSpeakSeconds = modeConfig.name === "MANUAL"
    ? manualSpeakSeconds
    : Math.max(5, Math.round((modeConfig.speakSeconds * DIFFICULTY_TIME_MULTIPLIER[selectedDifficulty]) / 5) * 5);

  // Timers
  const thinkTimer = useTimer(
    effectiveThinkSeconds,
    () => transitionToSpeak(),
    (secondsLeft) => {
      if (secondsLeft <= 5 && secondsLeft > 0 && secondsLeft !== lastTickPlayedRef.current) {
        playCountdownTick();
        lastTickPlayedRef.current = secondsLeft;
      }
    }
  );

  const speakTimer = useTimer(
    effectiveSpeakSeconds,
    () => transitionToPlayback(),
    (secondsLeft) => {
      if (secondsLeft <= 5 && secondsLeft > 0 && secondsLeft !== lastTickPlayedRef.current) {
        playCountdownTick();
        lastTickPlayedRef.current = secondsLeft;
      }
    }
  );

  // Cleanup
  useEffect(() => {
    return () => {
      thinkTimer.cleanup();
      speakTimer.cleanup();
      interviewThinkTimer.cleanup();
      interviewSpeakTimer.cleanup();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!accountMenuRef.current) return;
      const target = event.target as Node;
      if (!accountMenuRef.current.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAccountMenuOpen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsAccountMenuOpen(false);
    }
  }, [isAuthenticated]);

  // Audio progress tracking
  useEffect(() => {
    const updateProgress = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
      }
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    };
    
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  // Reset tick counter on screen change
  useEffect(() => {
    if (screen === "THINK" || screen === "SPEAK" || screen === "INTERVIEW_THINK" || screen === "INTERVIEW_SPEAK") {
      lastTickPlayedRef.current = -1;
    }
  }, [screen]);

  // Handle app backgrounding
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (screen === "THINK" || screen === "SPEAK") {
          handleCancel("APP_BACKGROUND");
        }
        if (screen === "INTERVIEW_THINK" || screen === "INTERVIEW_SPEAK") {
          handleInterviewCancel();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [screen]);

  // Navigation handlers
  const transitionToSpeak = useCallback(async () => {
    thinkTimer.pause();
    setScreen("SPEAK");
    lastTickPlayedRef.current = -1;
    speakTimer.reset(effectiveSpeakSeconds);
    playToneShift();
    await startRecording();
    if (isTranscriptionSupported) {
      startTranscription(selectedLanguage);
    }
    setTimeout(() => speakTimer.start(), 300);
  }, [effectiveSpeakSeconds, thinkTimer, speakTimer, playToneShift, startRecording, startTranscription, selectedLanguage]);

  const transitionToPlayback = useCallback(async () => {
    speakTimer.pause();
    await stopRecording();
    stopTranscription();
    setScreen("PLAYBACK");
  }, [speakTimer, stopRecording, stopTranscription]);

  // Interview flow transitions
  const transitionToInterviewSpeak = useCallback(async () => {
    interviewThinkTimer.pause();
    setScreen("INTERVIEW_SPEAK");
    lastTickPlayedRef.current = -1;
    const answeringSeconds = interview.currentQuestion?.answeringSeconds ?? 60;
    interviewSpeakTimer.reset(answeringSeconds);
    playToneShift();
    await startRecording();
    if (isTranscriptionSupported) {
      startTranscription(selectedLanguage);
    }
    setTimeout(() => interviewSpeakTimer.start(), 300);
  }, [interviewThinkTimer, interviewSpeakTimer, interview.currentQuestion, playToneShift, startRecording, startTranscription, selectedLanguage]);

  const transitionToInterviewPlayback = useCallback(async () => {
    interviewSpeakTimer.pause();
    await stopRecording();
    stopTranscription();
    setScreen("INTERVIEW_PLAYBACK");
  }, [interviewSpeakTimer, stopRecording, stopTranscription]);

  const handleInterviewStart = useCallback(async () => {
    init();
    try {
      const question = await interview.fetchNextQuestion();
      if (question) {
        setScreen("INTERVIEW_QUESTION");
      }
    } catch (error) {
      console.error("Failed to fetch interview question:", error);
      toast.error("Unable to fetch a question. Please try again.");
    }
  }, [init, interview]);

  const handleInterviewBegin = useCallback(() => {
    if (!interview.currentQuestion) return;
    const thinkingSeconds = interview.currentQuestion.thinkingSeconds;
    setScreen("INTERVIEW_THINK");
    lastTickPlayedRef.current = -1;
    interviewThinkTimer.reset(thinkingSeconds);
    interviewSpeakTimer.reset(interview.currentQuestion.answeringSeconds);
    playAmbientStart();
    setTimeout(() => interviewThinkTimer.start(), 500);
  }, [interview.currentQuestion, interviewThinkTimer, interviewSpeakTimer, playAmbientStart]);

  const handleInterviewCancel = useCallback(() => {
    interviewThinkTimer.pause();
    interviewSpeakTimer.pause();
    if (isRecording) stopRecording();
    resetRecording();
    resetTranscription();
    setScreen("INTERVIEW_HOME");
  }, [interviewThinkTimer, interviewSpeakTimer, isRecording, stopRecording, resetRecording, resetTranscription]);

  const handleInterviewResumeUpload = useCallback(async (file: File) => {
    try {
      await interview.uploadResume(file);
      toast.success("Resume analyzed successfully!");
    } catch (error) {
      // Error is already set in resumeState by the hook
      const err = error as Error;
      if (!err.message.includes("cooldown")) {
        toast.error(err.message || "Failed to upload resume.");
      }
    }
  }, [interview]);

  // Check resume status when navigating to interview home
  useEffect(() => {
    if (screen !== "INTERVIEW_HOME" || !isAuthenticated) return;
    if (interview.resumeState.isUploaded || interview.resumeState.isParsing) return;

    setIsCheckingResume(true);
    interview.checkResumeStatus().finally(() => setIsCheckingResume(false));
  }, [screen, isAuthenticated]);

  // Interview reflect/score handlers
  const [interviewRatings, setInterviewRatings] = useState<Partial<SessionRatings>>({});
  const [interviewNotes, setInterviewNotes] = useState("");

  const handleInterviewRateChange = (criteria: keyof SessionRatings, value: RatingValue) => {
    setInterviewRatings((prev) => ({ ...prev, [criteria]: value }));
  };

  const handleInterviewDoneRating = () => {
    if (!hasAllRatings(interviewRatings)) return;
    const overallScore = calculateOverallScore(interviewRatings);
    // Store the score for display
    setInterviewScore(overallScore);
    setScreen("INTERVIEW_SCORE");
  };

  const [interviewScore, setInterviewScore] = useState<number | null>(null);

  const handleInterviewNextQuestion = useCallback(async () => {
    // Reset interview state for next question
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    resetRecording();
    resetTranscription();
    setInterviewRatings({});
    setInterviewNotes("");
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setInterviewScore(null);

    // Fetch next question
    try {
      const question = await interview.fetchNextQuestion();
      if (question) {
        setScreen("INTERVIEW_QUESTION");
      }
    } catch (error) {
      console.error("Failed to fetch next question:", error);
      toast.error("Unable to fetch next question.");
      setScreen("INTERVIEW_HOME");
    }
  }, [interview, resetRecording, resetTranscription]);

  const handleCancel = useCallback(
    (reason: Parameters<typeof cancelSession>[0]) => {
      thinkTimer.pause();
      speakTimer.pause();
      if (isRecording) stopRecording();
      cancelSession(reason);
      resetState();
      setScreen("HOME");
    },
    [thinkTimer, speakTimer, isRecording, stopRecording, cancelSession]
  );

  const resetState = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    resetRecording();
    resetTranscription();
    setRatings({});
    setNotes("");
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSavedSessionId(null);
    setSaveAttemptedSessionId(null);
  };

  // Home screen handlers
  const handleModeCycle = () => {
    setModeConfig(getModeConfig(getNextMode(modeConfig.name)));
  };

  const handleLanguageChange = (language: SessionLanguage) => {
    setSelectedLanguage(language);
    resetUsedWords();
  };

  const handleDifficultyChange = (difficulty: SessionDifficulty) => {
    setSelectedDifficulty(difficulty);
    resetUsedWords();
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
        excludedWords: usedWords,
      });
    } catch (error) {
      console.error("Failed to fetch random word from backend:", error);
      toast.error("Unable to fetch a word right now. Please try again.");
      return;
    }

    setCurrentWord(newWord);
    addUsedWord(newWord);
    setSpinKey((k) => k + 1);
    setScreen("WORD_REVEAL");
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

  // Word reveal handlers
  const handleRevealComplete = () => {
    setIsRevealing(false);
    playThum();
    setTimeout(() => setShowWordActions(true), 400);
  };

  const handleStartSession = () => {
    createSession(
      modeConfig.name,
      selectedLanguage,
      selectedDifficulty,
      currentWord,
      effectiveThinkSeconds,
      effectiveSpeakSeconds
    );
    setScreen("THINK");
    lastTickPlayedRef.current = -1;
    thinkTimer.reset(effectiveThinkSeconds);
    speakTimer.reset(effectiveSpeakSeconds);
    playAmbientStart();
    setTimeout(() => thinkTimer.start(), 500);
  };

  // Playback handlers
  const handlePlayToggle = () => {
    if (!audio?.fileUri) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(audio.fileUri);
        audioRef.current.onended = () => setIsPlaying(false);
        // Set initial duration when loaded
        audioRef.current.onloadedmetadata = () => {
          setDuration(audioRef.current?.duration || 0);
        };
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSkipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSkipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Reflect handlers
  const handleRateChange = (criteria: keyof SessionRatings, value: RatingValue) => {
    setRatings((prev) => ({ ...prev, [criteria]: value }));
  };

  const handleDoneRating = () => {
    if (!hasAllRatings(ratings)) return;
    const overallScore = calculateOverallScore(ratings);
    completeSession(ratings, overallScore, notes, transcript);
    setSavedSessionId(null);
    setSaveAttemptedSessionId(null);
    setScreen("SCORE_SUMMARY");
  };

  // Score summary handlers
  const handleNewSession = () => {
    resetState();
    resetUsedWords();
    setHasRecordingPermission(null);
    setScreen("HOME");
  };

  const handleOpenHistory = useCallback(() => {
    if (!isAuthenticated) return;
    setIsAccountMenuOpen(false);
    setScreen("HISTORY");
  }, [isAuthenticated]);

  const loadRemoteSessions = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await apiClient("/api/sessions", { method: "GET" });
      if (!response.ok) {
        throw new Error(`Failed to load remote sessions (${response.status})`);
      }

      const payload = await response.json();
      if (!Array.isArray(payload)) {
        setRemoteSessions([]);
        return;
      }

      const mapped = (payload as Session[]).map((session) => ({
        ...session,
        language: session.language ?? DEFAULT_LANGUAGE,
        difficulty: session.difficulty ?? DEFAULT_DIFFICULTY,
      }));

      setRemoteSessions(mapped);
    } catch (error) {
      console.error("Failed to load remote sessions:", error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setRemoteSessions(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (screen !== "HISTORY" || !isAuthenticated) return;
    void loadRemoteSessions();
  }, [screen, isAuthenticated, loadRemoteSessions]);

  useEffect(() => {
    if (screen === "HISTORY" && !isAuthenticated) {
      setScreen("HOME");
    }
  }, [screen, isAuthenticated]);

  const historySessions = useMemo(() => {
    if (!isAuthenticated) return sessions;
    return remoteSessions ?? [];
  }, [isAuthenticated, remoteSessions, sessions]);

  const handleRequestFeature = useCallback(() => {
    setIsAccountMenuOpen(false);
    setScreen("FEATURE_REQUEST");
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast.success("Logged out");
      setScreen("HOME");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to log out");
    } finally {
      setIsAccountMenuOpen(false);
    }
  }, [logout]);

  const saveSessionAndGetAdvice = useCallback(async (
    sessionToSave: Session,
    options: { loginIfUnauthenticated: boolean; showToast: boolean }
  ) => {
    const { loginIfUnauthenticated, showToast } = options;

    if (!isAuthenticated) {
      if (loginIfUnauthenticated) {
        sessionStorage.setItem("pending_session", JSON.stringify(sessionToSave));
        login(window.location.pathname);
      }
      return false;
    }

    setSaveAttemptedSessionId(sessionToSave.id);
    setIsSaving(true);

    try {
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
          if (!blobResponse.ok) {
            throw new Error(`Failed to read local audio blob (${blobResponse.status})`);
          }

          const blob = await blobResponse.blob();
          if (blob.size <= 0) {
            throw new Error("Recorded blob is empty");
          }

          const uploadFormat = resolveUploadFormat(blob.type);
          if (!uploadFormat) {
            throw new Error(`Unsupported recorded audio format: ${blob.type || "unknown"}`);
          }

          const uploadFile = new File([blob], `session-${sessionToSave.id}${uploadFormat.extension}`, {
            type: uploadFormat.contentType,
          });

          const formData = new FormData();
          formData.append("file", uploadFile);

          const uploadRes = await apiClient("/api/audio/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) {
            throw new Error(`Audio upload failed (${uploadRes.status})`);
          }

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

          restoreSession(uploadReadySession);
        } catch (uploadError) {
          console.error("Audio upload error:", uploadError);
          if (showToast) {
            toast.warning("Session saved, but audio upload failed.");
          }
        }
      }

      let saveRes = await apiClient("/api/sessions", {
        method: "POST",
        body: JSON.stringify(uploadReadySession),
      });

      // Compatibility fallback for deployments that only expose /api/sessions/record
      if (saveRes.status === 404 || saveRes.status === 405) {
        saveRes = await apiClient("/api/sessions/record", {
          method: "POST",
          body: JSON.stringify(uploadReadySession),
        });
      }

      if (!saveRes.ok) {
        if (saveRes.status === 401 && loginIfUnauthenticated) {
          sessionStorage.setItem("pending_session", JSON.stringify(uploadReadySession));
          login(window.location.pathname);
          return false;
        }
        throw new Error(`Failed to save session (${saveRes.status})`);
      }

      const saveData = await saveRes.json();
      const advice = extractAdviceFromSaveResponse(saveData) ?? buildFallbackAdvice(uploadReadySession);
      const persistedSession: Session = advice
        ? { ...uploadReadySession, advice }
        : uploadReadySession;

      restoreSession(persistedSession);
      setSavedSessionId(sessionToSave.id);
      sessionStorage.removeItem("pending_session");

      if (showToast) {
        toast.success("Session saved.");
        if (advice) {
          toast.info(advice, { duration: 10000 });
        }
      }

      return true;
    } catch (error) {
      if (showToast) {
        toast.error("Failed to save session. Please try again.");
      }
      console.error("Save error:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isAuthenticated, login, restoreSession]);

  // Guest CTA: trigger login + save-after-auth flow
  const handleSaveAndGetAdvice = useCallback(async () => {
    if (!session) return;
    await saveSessionAndGetAdvice(session, { loginIfUnauthenticated: true, showToast: true });
  }, [session, saveSessionAndGetAdvice]);

  // Authenticated flow: auto-save when reaching score summary
  useEffect(() => {
    if (
      screen !== "SCORE_SUMMARY" ||
      !isAuthenticated ||
      !session ||
      session.status !== "COMPLETED"
    ) {
      return;
    }

    if (savedSessionId === session.id || saveAttemptedSessionId === session.id || isSaving) {
      return;
    }

    void saveSessionAndGetAdvice(session, { loginIfUnauthenticated: false, showToast: false });
  }, [
    screen,
    isAuthenticated,
    session,
    savedSessionId,
    saveAttemptedSessionId,
    isSaving,
    saveSessionAndGetAdvice,
  ]);

  const handleReplay = () => {
    if (!audio?.fileUri) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audio.fileUri);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current?.duration || 0);
      };
    }
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    audioRef.current.play();
    setIsPlaying(true);
  };

  const handleReplayHistoryAudio = useCallback(async (historySession: Session) => {
    try {
      let audioUrl = historySession.audio?.fileUri;

      if (!audioUrl) {
        if (!historySession.audio?.objectKey) {
          toast.error("No audio available for this session.");
          return;
        }

        const response = await apiClient(`/api/sessions/${historySession.id}/audio-url`, {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error(`Failed to get audio URL (${response.status})`);
        }

        const payload = (await response.json()) as { url?: unknown };
        if (typeof payload.url !== "string" || payload.url.trim().length === 0) {
          throw new Error("Audio URL is missing in response");
        }

        audioUrl = payload.url;
      }

      const audioInstance = new Audio(audioUrl);
      await audioInstance.play();
    } catch (error) {
      console.error("History audio replay error:", error);
      toast.error("Unable to replay this audio file.");
    }
  }, []);

  const handleDeleteHistorySession = useCallback(async (id: string) => {
    try {
      if (isAuthenticated) {
        const response = await apiClient(`/api/sessions/${id}`, { method: "DELETE" });
        if (!response.ok && response.status !== 404) {
          throw new Error(`Failed to delete session (${response.status})`);
        }

        setRemoteSessions((prev) => prev?.filter((session) => session.id !== id) ?? prev);
      }

      deleteHistorySession(id);
      if (savedSessionId === id) {
        setSavedSessionId(null);
      }
      if (saveAttemptedSessionId === id) {
        setSaveAttemptedSessionId(null);
      }

      toast.success("Session removed from history.");
    } catch (error) {
      console.error("Delete session error:", error);
      toast.error("Failed to delete session.");
    }
  }, [deleteHistorySession, isAuthenticated, savedSessionId, saveAttemptedSessionId]);

  // Navbar navigation handler
  const handleNavNavigate = useCallback((navSection: NavSection) => {
    // If in active flow, cancel first
    if (["THINK", "SPEAK", "PLAYBACK", "REFLECT"].includes(screen)) {
      handleCancel("USER_BACK");
    }
    if (["INTERVIEW_THINK", "INTERVIEW_SPEAK", "INTERVIEW_PLAYBACK", "INTERVIEW_REFLECT"].includes(screen)) {
      handleInterviewCancel();
    }

    switch (navSection) {
      case "GENERAL_PRACTICE":
        setScreen("HOME");
        break;
      case "INTERVIEWS":
        setScreen("INTERVIEW_HOME");
        break;
      case "HISTORY":
        if (isAuthenticated) setScreen("HISTORY");
        break;
    }
  }, [screen, isAuthenticated, handleCancel, handleInterviewCancel]);

  // Back navigation
  const handleBack = () => {
    switch (screen) {
      case "WORD_REVEAL":
        setScreen("HOME");
        break;
      case "HISTORY":
        setScreen("HOME");
        break;
      case "FEATURE_REQUEST":
        setScreen("HOME");
        break;
      case "THINK":
      case "SPEAK":
      case "PLAYBACK":
        handleCancel("USER_BACK");
        break;
      case "REFLECT":
        setScreen("PLAYBACK");
        break;
      case "SCORE_SUMMARY":
        handleNewSession();
        break;
      // Interview screens
      case "INTERVIEW_QUESTION":
        setScreen("INTERVIEW_HOME");
        break;
      case "INTERVIEW_THINK":
      case "INTERVIEW_SPEAK":
        handleInterviewCancel();
        break;
      case "INTERVIEW_PLAYBACK":
        handleInterviewCancel();
        break;
      case "INTERVIEW_REFLECT":
        setScreen("INTERVIEW_PLAYBACK");
        break;
      case "INTERVIEW_SCORE":
        setScreen("INTERVIEW_HOME");
        break;
    }
  };

  const canAccessHistory = isAuthenticated && !isAuthSuccessPage && !isAuthErrorPage;
  const isHistoryScreen = screen === "HISTORY";

  return (
    <div
      className="min-h-screen bg-[#FDF6F0] selection:bg-[#1a1a1a]/15 selection:text-[#1a1a1a]"
      style={{ fontFamily: '"Inter", "Cormorant Garamond", sans-serif' }}
    >
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#FDF6F0',
            fontFamily: '"Inter", sans-serif',
            fontSize: '13px',
            border: 'none',
            borderRadius: '0',
          },
        }}
      />
      {/* Top Navbar */}
      {showNavbar && (
        <TopNavbar
          activeSection={section}
          onNavigate={handleNavNavigate}
          isAuthenticated={isAuthenticated}
          isAuthLoading={isAuthLoading}
          user={user}
          isAccountMenuOpen={isAccountMenuOpen}
          onToggleAccountMenu={() => setIsAccountMenuOpen((prev) => !prev)}
          onLogin={() => login()}
          onLogout={() => { void handleLogout(); }}
          onRequestFeature={handleRequestFeature}
          accountMenuRef={accountMenuRef}
        />
      )}

      {/* Back button */}
      {screen !== "HOME" && screen !== "INTERVIEW_HOME" && (
        <button
          type="button"
          onClick={handleBack}
          className={`absolute left-4 z-50 p-2 text-[#1a1a1a]/50 transition-colors hover:text-[#1a1a1a]/80 sm:left-6 md:left-8 ${
            showNavbar ? "top-14 sm:top-14 md:top-14" : "top-4 sm:top-6 md:top-8"
          }`}
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <AnimatePresence mode="wait">
        {screen === "HISTORY" && isAuthenticated && (
          <HistoryScreen
            sessions={historySessions}
            isAuthenticated={isAuthenticated}
            onBack={() => setScreen("HOME")}
            onDeleteSession={handleDeleteHistorySession}
            onReplayAudio={handleReplayHistoryAudio}
          />
        )}

        {screen === "HOME" && (
          <HomeScreen
            modeConfig={modeConfig}
            manualThinkSeconds={manualThinkSeconds}
            manualSpeakSeconds={manualSpeakSeconds}
            selectedLanguage={selectedLanguage}
            selectedDifficulty={selectedDifficulty}
            isRecordingSupported={isRecordingSupported}
            hasRecordingPermission={hasRecordingPermission}
            isRequestingPermission={isRequestingPermission}
            onModeCycle={handleModeCycle}
            onLanguageChange={handleLanguageChange}
            onDifficultyChange={handleDifficultyChange}
            onManualTimeChange={handleManualTimeChange}
            onRequestPermission={handleRequestPermission}
            onSpin={handleSpin}
          />
        )}

        {screen === "FEATURE_REQUEST" && (
          <FeatureRequestScreen />
        )}

        {screen === "WORD_REVEAL" && (
          <WordRevealScreen
            word={currentWord}
            language={selectedLanguage}
            modeConfig={modeConfig}
            spinKey={spinKey}
            isRevealing={isRevealing}
            showActions={showWordActions}
            onRevealComplete={handleRevealComplete}
            onLetterSettle={playTock}
            onSpinAgain={handleSpin}
            onStart={handleStartSession}
          />
        )}

        {screen === "THINK" && (
          <ThinkScreen
            word={currentWord}
            seconds={thinkTimer.seconds}
            totalSeconds={effectiveThinkSeconds}
            onSkip={transitionToSpeak}
          />
        )}

        {screen === "SPEAK" && (
          <SpeakScreen
            word={currentWord}
            seconds={speakTimer.seconds}
            totalSeconds={effectiveSpeakSeconds}
            isRecording={isRecording}
            audio={audio}
            isTranscribing={isTranscribing}
          />
        )}

        {screen === "PLAYBACK" && (
          <PlaybackScreen
            word={currentWord}
            modeConfig={modeConfig}
            audio={audio}
            transcript={transcript}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayToggle={handlePlayToggle}
            onSeek={handleSeek}
            onSkipBackward={handleSkipBackward}
            onSkipForward={handleSkipForward}
            onContinue={() => {
              if (isPlaying) {
                audioRef.current?.pause();
                setIsPlaying(false);
              }
              setScreen("REFLECT");
            }}
          />
        )}

        {screen === "REFLECT" && (
          <ReflectScreen
            ratings={ratings}
            notes={notes}
            canComplete={hasAllRatings(ratings)}
            onRateChange={handleRateChange}
            onNotesChange={setNotes}
            onDone={handleDoneRating}
          />
        )}

        {screen === "SCORE_SUMMARY" && session?.overallScore !== undefined && (
          <ScoreSummaryScreen
            overallScore={session.overallScore}
            audio={audio}
            advice={session.advice ?? null}
            isSaving={isSaving}
            isSaved={savedSessionId === session.id}
            isAuthenticated={isAuthenticated}
            user={user}
            onNewSession={handleNewSession}
            onReplay={handleReplay}
            onSaveAndGetAdvice={handleSaveAndGetAdvice}
          />
        )}

        {/* Interview screens */}
        {screen === "INTERVIEW_HOME" && (
          <InterviewHomeScreen
            resumeState={interview.resumeState}
            categories={interview.categories}
            selectedCategory={interview.selectedCategory}
            selectedDifficulty={interview.selectedDifficulty}
            selectedLanguage={selectedLanguage}
            isFetchingQuestion={interview.isFetchingQuestion}
            isCheckingResume={isCheckingResume}
            onFileSelected={handleInterviewResumeUpload}
            onCategoryChange={interview.setSelectedCategory}
            onDifficultyChange={interview.setSelectedDifficulty}
            onLanguageChange={handleLanguageChange}
            onStart={handleInterviewStart}
          />
        )}

        {screen === "INTERVIEW_QUESTION" && interview.currentQuestion && (
          <InterviewQuestionScreen
            question={interview.currentQuestion}
            onBegin={handleInterviewBegin}
          />
        )}

        {screen === "INTERVIEW_THINK" && interview.currentQuestion && (
          <InterviewThinkScreen
            question={interview.currentQuestion.question}
            seconds={interviewThinkTimer.seconds}
            totalSeconds={interview.currentQuestion.thinkingSeconds}
            onSkip={transitionToInterviewSpeak}
          />
        )}

        {screen === "INTERVIEW_SPEAK" && interview.currentQuestion && (
          <InterviewSpeakScreen
            question={interview.currentQuestion.question}
            seconds={interviewSpeakTimer.seconds}
            totalSeconds={interview.currentQuestion.answeringSeconds}
            isRecording={isRecording}
            audio={audio}
            isTranscribing={isTranscribing}
          />
        )}

        {screen === "INTERVIEW_PLAYBACK" && interview.currentQuestion && (
          <InterviewPlaybackScreen
            question={interview.currentQuestion.question}
            category={interview.currentQuestion.category}
            audio={audio}
            transcript={transcript}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayToggle={handlePlayToggle}
            onSeek={handleSeek}
            onSkipBackward={handleSkipBackward}
            onSkipForward={handleSkipForward}
            onContinue={() => {
              if (isPlaying) {
                audioRef.current?.pause();
                setIsPlaying(false);
              }
              setScreen("INTERVIEW_REFLECT");
            }}
          />
        )}

        {screen === "INTERVIEW_REFLECT" && (
          <ReflectScreen
            ratings={interviewRatings}
            notes={interviewNotes}
            canComplete={hasAllRatings(interviewRatings)}
            onRateChange={handleInterviewRateChange}
            onNotesChange={setInterviewNotes}
            onDone={handleInterviewDoneRating}
          />
        )}

        {screen === "INTERVIEW_SCORE" && interviewScore !== null && (
          <ScoreSummaryScreen
            overallScore={interviewScore}
            audio={audio}
            advice={null}
            isSaving={false}
            isSaved={false}
            isAuthenticated={isAuthenticated}
            user={user}
            onNewSession={handleInterviewNextQuestion}
            onReplay={handleReplay}
            onSaveAndGetAdvice={() => {}}
          />
        )}

        {/* Auth callback screens */}
        {isAuthSuccessPage && (
          <AuthSuccessScreen
            onContinue={(authedUser) => {
              clearAuthParams();
              // Check if there's a pending session to save
              const pendingSession = sessionStorage.getItem("pending_session");
              if (authedUser && pendingSession) {
                let restored = false;
                try {
                  const parsedSession = JSON.parse(pendingSession) as Session;
                  if (parsedSession?.id && parsedSession?.overallScore !== undefined) {
                    restoreSession({
                      ...parsedSession,
                      language: parsedSession.language ?? DEFAULT_LANGUAGE,
                      difficulty: parsedSession.difficulty ?? DEFAULT_DIFFICULTY,
                    });
                    setSavedSessionId(null);
                    setSaveAttemptedSessionId(null);
                    restored = true;
                  }
                } catch (error) {
                  console.error("Failed to restore pending session:", error);
                  sessionStorage.removeItem("pending_session");
                }
                setScreen(restored ? "SCORE_SUMMARY" : "HOME");
              } else {
                setScreen("HOME");
              }
            }}
          />
        )}

        {isAuthErrorPage && (
          <AuthErrorScreen
            error={authError}
            onGoHome={() => {
              clearAuthParams();
              setScreen("HOME");
            }}
            onRetry={() => {
              clearAuthParams();
              login(window.location.pathname);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
