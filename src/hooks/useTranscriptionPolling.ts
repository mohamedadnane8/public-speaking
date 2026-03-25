import { useState, useEffect, useRef, useCallback } from "react";
import { fetchSession } from "@/lib/interviewApi";
import type { TranscriptionStatus } from "@/types/session";

const POLL_INTERVAL = 3000;
const MAX_POLL_DURATION = 120_000; // 2 minutes

interface UseTranscriptionPollingReturn {
  transcriptionStatus: TranscriptionStatus | null;
  transcript: string | null;
  isPolling: boolean;
  error: string | null;
}

export function useTranscriptionPolling(
  sessionId: string | null,
  enabled: boolean
): UseTranscriptionPollingReturn {
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const prevSessionIdRef = useRef<string | null>(null);

  // Reset state when sessionId changes to avoid showing stale transcript from previous session
  useEffect(() => {
    if (sessionId !== prevSessionIdRef.current) {
      setTranscript(null);
      setTranscriptionStatus(null);
      setError(null);
      setIsPolling(false);
      prevSessionIdRef.current = sessionId;
    }
  }, [sessionId]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (!sessionId || !enabled) {
      stopPolling();
      return;
    }

    // Don't poll if already completed, failed, or transcript already available
    if (transcriptionStatus === "Completed" || transcriptionStatus === "Failed" || transcript) {
      return;
    }

    setIsPolling(true);
    setError(null);
    startTimeRef.current = Date.now();

    const poll = async () => {
      // Timeout check
      if (Date.now() - startTimeRef.current > MAX_POLL_DURATION) {
        setError("Transcription timed out");
        stopPolling();
        return;
      }

      try {
        const session = await fetchSession(sessionId);
        const status = session.transcriptionStatus ?? null;
        setTranscriptionStatus(status);

        if (session.transcript) {
          setTranscript(session.transcript);
        }

        // Stop polling if: explicit terminal status, OR transcript already exists (backend may leave status null)
        if (status === "Completed" || status === "Failed" || session.transcript) {
          if (status === "Failed") {
            setError(session.transcriptionError ?? "Transcription failed");
          }
          if (session.transcript && !status) {
            setTranscriptionStatus("Completed");
          }
          stopPolling();
        }
      } catch {
        // Network error — keep polling, don't stop
      }
    };

    // Initial poll immediately
    void poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);

    return () => stopPolling();
  }, [sessionId, enabled, transcriptionStatus, transcript, stopPolling]);

  return { transcriptionStatus, transcript, isPolling, error };
}
