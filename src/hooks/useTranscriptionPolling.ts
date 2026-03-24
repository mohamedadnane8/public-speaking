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

    // Don't poll if already completed or failed
    if (transcriptionStatus === "Completed" || transcriptionStatus === "Failed") {
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

        if (status === "Completed" || status === "Failed") {
          if (status === "Failed") {
            setError(session.transcriptionError ?? "Transcription failed");
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
  }, [sessionId, enabled, transcriptionStatus, stopPolling]);

  return { transcriptionStatus, transcript, isPolling, error };
}
