import { useState, useRef, useCallback } from "react";

interface UseTimerReturn {
  seconds: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (newSeconds: number) => void;
  cleanup: () => void;
}

export function useTimer(
  initialSeconds: number,
  onComplete?: () => void,
  onTick?: (secondsLeft: number) => void
): UseTimerReturn {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRunningRef = useRef(false);
  const secondsRef = useRef(seconds);
  const onTickRef = useRef(onTick);

  onTickRef.current = onTick;
  // NOTE: Do NOT sync secondsRef from seconds state here.
  // reset() writes to secondsRef directly, and a re-render between
  // reset() and start() would overwrite it with the stale state value.

  const start = useCallback(() => {
    const current = secondsRef.current;
    // Use ref to prevent race conditions - state updates are async
    if (!isRunningRef.current && current > 0) {
      isRunningRef.current = true;
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          const next = prev - 1;
          secondsRef.current = next;
          if (next >= 0) {
            onTickRef.current?.(next);
          }
          if (next <= 0) {
            isRunningRef.current = false;
            setIsRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            onComplete?.();
            return 0;
          }
          return next;
        });
      }, 1000);
    }
  }, [onComplete]);

  const pause = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback((newSeconds: number) => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSeconds(newSeconds);
    secondsRef.current = newSeconds;
  }, []);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { seconds, isRunning, start, pause, reset, cleanup };
}
