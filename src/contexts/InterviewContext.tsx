import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useTimer } from "../hooks/useTimer";
import { useInterview } from "../hooks/useInterview";
import { useAppContext } from "./AppContext";
import { useSessionContext } from "./SessionContext";
import { usePracticeContext } from "./PracticeContext";
import { calculateInterviewScore, hasAllInterviewRatings } from "../lib/scoring";
import type { InterviewRatings, RatingValue } from "../types/session";

interface InterviewContextValue {
  interview: ReturnType<typeof useInterview>;
  interviewSpinKey: number;
  isInterviewRevealing: boolean;
  showInterviewActions: boolean;
  interviewThinkSeconds: number;
  interviewAnswerSeconds: number;
  interviewThinkTimer: ReturnType<typeof useTimer>;
  interviewSpeakTimer: ReturnType<typeof useTimer>;
  interviewRatings: Partial<InterviewRatings>;
  interviewNotes: string;
  setInterviewNotes: React.Dispatch<React.SetStateAction<string>>;
  interviewScore: number | null;
  isCheckingResume: boolean;
  handleInterviewStart: () => Promise<void>;
  handleInterviewBegin: (thinkSeconds: number, answerSeconds: number) => void;
  handleInterviewCancel: () => void;
  handleInterviewResumeUpload: (file: File) => Promise<void>;
  handleInterviewRateChange: (criteria: keyof InterviewRatings, value: RatingValue) => void;
  handleInterviewDoneRating: () => void;
  handleInterviewNextQuestion: () => Promise<void>;
  handleInterviewSpinAgain: () => Promise<void>;
  handleInterviewRevealComplete: () => void;
  transitionToInterviewSpeak: () => Promise<void>;
  transitionToInterviewPlayback: () => Promise<void>;
}

const InterviewCtx = createContext<InterviewContextValue | null>(null);

export function useInterviewContext() {
  const ctx = useContext(InterviewCtx);
  if (!ctx) throw new Error("useInterviewContext must be used within InterviewProvider");
  return ctx;
}

export function InterviewProvider({ children }: { children: ReactNode }) {
  const app = useAppContext();
  const sess = useSessionContext();
  const practice = usePracticeContext();
  const interview = useInterview();

  const [interviewSpinKey, setInterviewSpinKey] = useState(0);
  const [isInterviewRevealing, setIsInterviewRevealing] = useState(false);
  const [showInterviewActions, setShowInterviewActions] = useState(false);
  const [interviewThinkSeconds, setInterviewThinkSeconds] = useState(30);
  const [interviewAnswerSeconds, setInterviewAnswerSeconds] = useState(60);
  const [interviewRatings, setInterviewRatings] = useState<Partial<InterviewRatings>>({});
  const [interviewNotes, setInterviewNotes] = useState("");
  const [interviewScore, setInterviewScore] = useState<number | null>(null);
  const [isCheckingResume, setIsCheckingResume] = useState(false);

  const lastTickPlayedRef = useRef<number>(-1);
  const transitionToInterviewSpeakRef = useRef<() => Promise<void>>(undefined);
  const transitionToInterviewPlaybackRef = useRef<() => Promise<void>>(undefined);

  // Timers
  const interviewThinkTimer = useTimer(
    interview.currentQuestion?.thinkingSeconds ?? 30,
    () => { transitionToInterviewSpeakRef.current?.(); },
    (secondsLeft) => {
      if (secondsLeft <= 5 && secondsLeft > 0 && secondsLeft !== lastTickPlayedRef.current) {
        lastTickPlayedRef.current = secondsLeft;
      }
    }
  );

  const interviewSpeakTimer = useTimer(
    interview.currentQuestion?.answeringSeconds ?? 60,
    () => { transitionToInterviewPlaybackRef.current?.(); },
    (secondsLeft) => {
      if (secondsLeft <= 5 && secondsLeft > 0 && secondsLeft !== lastTickPlayedRef.current) {
        lastTickPlayedRef.current = secondsLeft;
      }
    }
  );

  useEffect(() => {
    if (app.screen === "INTERVIEW_THINK" || app.screen === "INTERVIEW_SPEAK") {
      lastTickPlayedRef.current = -1;
    }
  }, [app.screen]);

  useEffect(() => {
    return () => { interviewThinkTimer.cleanup(); interviewSpeakTimer.cleanup(); };
  }, []);

  // Check resume on interview home
  useEffect(() => {
    if (app.screen !== "INTERVIEW_HOME" || !app.isAuthenticated) return;
    if (interview.resumeState.isUploaded || interview.resumeState.isParsing) return;
    setIsCheckingResume(true);
    interview.checkResumeStatus().finally(() => setIsCheckingResume(false));
  }, [app.screen, app.isAuthenticated]);

  // App backgrounding
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && (app.screen === "INTERVIEW_THINK" || app.screen === "INTERVIEW_SPEAK")) {
        handleInterviewCancel();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [app.screen]);

  // Trigger early save on INTERVIEW_PLAYBACK
  useEffect(() => {
    if (app.screen !== "INTERVIEW_PLAYBACK") return;
    if (sess.earlySaveStatus !== "idle") return;
    if (!sess.audio?.available || !sess.audio.fileUri || !sess.audio.fileUri.startsWith("blob:")) return;
    if (!app.isAuthenticated) return;

    void sess.saveSessionEarly(
      "Interview",
      interview.currentQuestion?.question ?? "",
      practice.selectedLanguage,
      practice.selectedDifficulty,
      interview.currentQuestion?.thinkingSeconds ?? interviewThinkSeconds,
      interview.currentQuestion?.answeringSeconds ?? interviewAnswerSeconds,
      practice.modeConfig.name,
    );
  }, [app.screen, sess.audio, sess.earlySaveStatus, app.isAuthenticated]);

  // Transitions
  const transitionToInterviewSpeak = useCallback(async () => {
    interviewThinkTimer.pause();
    app.setScreen("INTERVIEW_SPEAK");
    lastTickPlayedRef.current = -1;
    interviewSpeakTimer.reset(interviewAnswerSeconds);
    await sess.startRecording();
    interviewSpeakTimer.start();
  }, [interviewThinkTimer, interviewSpeakTimer, interviewAnswerSeconds, sess.startRecording, app.setScreen]);

  const transitionToInterviewPlayback = useCallback(async () => {
    interviewSpeakTimer.pause();
    // Keep recording a tiny tail to avoid clipping the end of speech.
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    await sess.stopRecording();
    app.setScreen("INTERVIEW_PLAYBACK");
  }, [interviewSpeakTimer, sess.stopRecording, app.setScreen]);

  transitionToInterviewSpeakRef.current = transitionToInterviewSpeak;
  transitionToInterviewPlaybackRef.current = transitionToInterviewPlayback;

  const handleInterviewRevealComplete = useCallback(() => {
    setIsInterviewRevealing(false);
    practice.playTock();
    setTimeout(() => setShowInterviewActions(true), 400);
  }, [practice.playTock]);

  const handleInterviewStart = useCallback(async () => {
    try {
      const question = await interview.fetchNextQuestion();
      if (question) {
        setInterviewSpinKey((k) => k + 1);
        setIsInterviewRevealing(true);
        setShowInterviewActions(false);
        app.setScreen("INTERVIEW_QUESTION");
      }
    } catch (error) {
      console.error("Failed to fetch interview question:", error);
      toast.error("Unable to fetch a question. Please try again.");
    }
  }, [interview, app.setScreen]);

  const handleInterviewBegin = useCallback((thinkSeconds: number, answerSeconds: number) => {
    if (!interview.currentQuestion) return;

    // Start each interview answer with a fresh shared session state
    // to avoid showing transcript/analysis from a previous flow.
    sess.resetRecording();
    sess.setSavedSessionId(null);
    sess.setSaveAttemptedSessionId(null);
    sess.setSavedServerSessionId(null);
    sess.setSavedSpeechAnalysis(null);
    sess.setEarlySaveStatus("idle");
    sess.createSession(
      practice.modeConfig.name,
      practice.selectedLanguage,
      practice.selectedDifficulty,
      interview.currentQuestion.question,
      thinkSeconds,
      answerSeconds
    );

    setInterviewThinkSeconds(thinkSeconds);
    setInterviewAnswerSeconds(answerSeconds);
    app.setScreen("INTERVIEW_THINK");
    lastTickPlayedRef.current = -1;
    interviewThinkTimer.reset(thinkSeconds);
    interviewSpeakTimer.reset(answerSeconds);
    setTimeout(() => interviewThinkTimer.start(), 500);
  }, [
    interview.currentQuestion,
    interviewThinkTimer,
    interviewSpeakTimer,
    app.setScreen,
    sess.resetRecording,
    sess.setSavedSessionId,
    sess.setSaveAttemptedSessionId,
    sess.setSavedServerSessionId,
    sess.setSavedSpeechAnalysis,
    sess.setEarlySaveStatus,
    sess.createSession,
    practice.modeConfig.name,
    practice.selectedLanguage,
    practice.selectedDifficulty,
  ]);

  const handleInterviewCancel = useCallback(() => {
    interviewThinkTimer.pause();
    interviewSpeakTimer.pause();
    if (sess.isRecording) sess.stopRecording();
    sess.resetRecording();
    sess.setSavedSessionId(null);
    sess.setSaveAttemptedSessionId(null);
    sess.setSavedServerSessionId(null);
    sess.setSavedSpeechAnalysis(null);
    sess.setEarlySaveStatus("idle");
    app.setScreen("INTERVIEW_HOME");
  }, [
    interviewThinkTimer,
    interviewSpeakTimer,
    sess.isRecording,
    sess.stopRecording,
    sess.resetRecording,
    sess.setSavedSessionId,
    sess.setSaveAttemptedSessionId,
    sess.setSavedServerSessionId,
    sess.setSavedSpeechAnalysis,
    sess.setEarlySaveStatus,
    app.setScreen,
  ]);

  const handleInterviewResumeUpload = useCallback(async (file: File) => {
    try {
      await interview.uploadResume(file);
      toast.success("Resume analyzed successfully!");
    } catch (error) {
      const err = error as Error;
      if (!err.message.includes("cooldown")) toast.error(err.message || "Failed to upload resume.");
    }
  }, [interview]);

  const handleInterviewRateChange = (criteria: keyof InterviewRatings, value: RatingValue) => {
    setInterviewRatings((prev) => ({ ...prev, [criteria]: value }));
  };

  const handleInterviewDoneRating = () => {
    if (!hasAllInterviewRatings(interviewRatings)) return;
    const overallScore = calculateInterviewScore(interviewRatings);
    setInterviewScore(overallScore);
    app.setScreen("INTERVIEW_SCORE");
  };

  const handleInterviewNextQuestion = useCallback(async () => {
    if (app.audioRef.current) { app.audioRef.current.pause(); app.audioRef.current = null; }
    app.audioSrcRef.current = null;
    sess.resetRecording();
    setInterviewRatings({});
    setInterviewNotes("");
    app.setIsPlaying(false);
    app.setCurrentTime(0);
    app.setDuration(0);
    setInterviewScore(null);
    sess.setSavedServerSessionId(null);
    sess.setSavedSpeechAnalysis(null);
    sess.setEarlySaveStatus("idle");

    try {
      const question = await interview.fetchNextQuestion();
      if (question) {
        setInterviewSpinKey((k) => k + 1);
        setIsInterviewRevealing(true);
        setShowInterviewActions(false);
        app.setScreen("INTERVIEW_QUESTION");
      }
    } catch (error) {
      console.error("Failed to fetch next question:", error);
      toast.error("Unable to fetch next question.");
      app.setScreen("INTERVIEW_HOME");
    }
  }, [interview, sess, app]);

  const handleInterviewSpinAgain = useCallback(async () => {
    try {
      const question = await interview.fetchNextQuestion();
      if (question) {
        setInterviewSpinKey((k) => k + 1);
        setIsInterviewRevealing(true);
        setShowInterviewActions(false);
      }
    } catch (error) {
      console.error("Failed to fetch question:", error);
      toast.error("Unable to fetch a question. Please try again.");
    }
  }, [interview]);

  const value = useMemo<InterviewContextValue>(() => ({
    interview,
    interviewSpinKey, isInterviewRevealing, showInterviewActions,
    interviewThinkSeconds, interviewAnswerSeconds,
    interviewThinkTimer, interviewSpeakTimer,
    interviewRatings, interviewNotes, setInterviewNotes, interviewScore,
    isCheckingResume,
    handleInterviewStart, handleInterviewBegin, handleInterviewCancel,
    handleInterviewResumeUpload, handleInterviewRateChange, handleInterviewDoneRating,
    handleInterviewNextQuestion, handleInterviewSpinAgain, handleInterviewRevealComplete,
    transitionToInterviewSpeak, transitionToInterviewPlayback,
  }), [
    interview,
    interviewSpinKey, isInterviewRevealing, showInterviewActions,
    interviewThinkSeconds, interviewAnswerSeconds,
    interviewThinkTimer, interviewSpeakTimer,
    interviewRatings, interviewNotes, interviewScore,
    isCheckingResume,
    handleInterviewStart, handleInterviewBegin, handleInterviewCancel,
    handleInterviewResumeUpload, handleInterviewDoneRating,
    handleInterviewNextQuestion, handleInterviewSpinAgain, handleInterviewRevealComplete,
    transitionToInterviewSpeak, transitionToInterviewPlayback,
  ]);

  return <InterviewCtx.Provider value={value}>{children}</InterviewCtx.Provider>;
}
