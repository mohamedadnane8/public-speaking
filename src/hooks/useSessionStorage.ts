import { useState, useEffect, useCallback } from "react";
import type { Session } from "@/types/session";

const STORAGE_KEY = "impromptu_sessions";
const MAX_SESSIONS = 50; // Keep last 50 sessions to avoid storage overflow

export function useSessionStorage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Session[];
        setSessions(parsed);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      } catch (error) {
        console.error("Failed to save sessions:", error);
      }
    }
  }, [sessions, isLoaded]);

  const saveSession = useCallback((session: Session) => {
    setSessions((prev) => {
      // Replace existing session if same ID, otherwise add new
      const filtered = prev.filter((s) => s.id !== session.id);
      const updated = [session, ...filtered];
      // Keep only last N sessions
      return updated.slice(0, MAX_SESSIONS);
    });
  }, []);

  const getSession = useCallback(
    (id: string): Session | undefined => {
      return sessions.find((s) => s.id === id);
    },
    [sessions]
  );

  const updateSession = useCallback(
    (id: string, updates: Partial<Session>) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    sessions,
    isLoaded,
    saveSession,
    getSession,
    updateSession,
    deleteSession,
  };
}
