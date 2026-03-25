import { useState, useCallback } from "react";
import { useAudioRecorder } from "./useAudioRecorder";
import { useSessionStorage } from "./useSessionStorage";
import type { Session, SessionRatings, InterviewRatings, Mode, SessionDifficulty, SessionLanguage } from "@/types/session";

interface UseSessionReturn {
  session: Session | null;
  sessions: Session[];
  audio: Session["audio"] | null;
  isRecording: boolean;
  usedWords: string[];
  createSession: (
    mode: Mode,
    language: SessionLanguage,
    difficulty: SessionDifficulty,
    word: string,
    thinkSeconds: number,
    speakSeconds: number
  ) => Session;
  completeSession: (ratings: SessionRatings, overallScore: number, notes?: string, transcript?: string) => void;
  completeInterviewSession: (interviewRatings: InterviewRatings, overallScore: number, notes?: string) => void;
  cancelSession: (reason: Session["cancelReason"]) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  resetRecording: () => void;
  restoreSession: (session: Session) => void;
  deleteHistorySession: (id: string) => void;
  addUsedWord: (word: string) => void;
  resetUsedWords: () => void;
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const { audio, isRecording, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const { sessions, saveSession, updateSession, deleteSession } = useSessionStorage();

  const createSession = useCallback((
    mode: Mode,
    language: SessionLanguage,
    difficulty: SessionDifficulty,
    word: string,
    thinkSeconds: number,
    speakSeconds: number
  ): Session => {
    const newSession: Session = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      mode,
      language,
      difficulty,
      word,
      thinkSeconds,
      speakSeconds,
      status: "COMPLETED",
    };
    
    setSession(newSession);
    saveSession(newSession);
    return newSession;
  }, [saveSession]);

  const completeSession = useCallback((
    ratings: SessionRatings,
    overallScore: number,
    notes?: string,
    transcript?: string
  ) => {
    if (!session) return;
    
    const completedSession: Session = {
      ...session,
      ratings,
      overallScore,
      notes: notes?.trim() || undefined,
      transcript: transcript?.trim() || undefined,
      completedAt: new Date().toISOString(),
      audio: audio || { available: false },
    };
    
    setSession(completedSession);
    updateSession(session.id, completedSession);
  }, [session, audio, updateSession]);

  const completeInterviewSession = useCallback((
    interviewRatings: InterviewRatings,
    overallScore: number,
    notes?: string
  ) => {
    if (!session) return;

    const completedSession: Session = {
      ...session,
      interviewRatings,
      overallScore,
      notes: notes?.trim() || undefined,
      completedAt: new Date().toISOString(),
      audio: audio || { available: false },
    };

    setSession(completedSession);
    updateSession(session.id, completedSession);
  }, [session, audio, updateSession]);

  const cancelSession = useCallback((reason: Session["cancelReason"]) => {
    if (session) {
      const cancelledSession: Session = {
        ...session,
        status: "CANCELLED",
        cancelReason: reason,
      };
      saveSession(cancelledSession);
    }
    setSession(null);
  }, [session, saveSession]);

  const restoreSession = useCallback((savedSession: Session) => {
    setSession(savedSession);
    saveSession(savedSession);
  }, [saveSession]);

  const deleteHistorySession = useCallback((id: string) => {
    deleteSession(id);
    setSession((current) => (current?.id === id ? null : current));
  }, [deleteSession]);

  const addUsedWord = useCallback((word: string) => {
    setUsedWords((prev) => [...prev, word]);
  }, []);

  const resetUsedWords = useCallback(() => {
    setUsedWords([]);
  }, []);

  return {
    session,
    sessions,
    audio,
    isRecording,
    usedWords,
    createSession,
    completeSession,
    completeInterviewSession,
    cancelSession,
    startRecording,
    stopRecording,
    resetRecording,
    restoreSession,
    deleteHistorySession,
    addUsedWord,
    resetUsedWords,
  };
}
