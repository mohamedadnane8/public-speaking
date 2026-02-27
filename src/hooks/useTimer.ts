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
  const secondsRef = useRef(seconds);
  const onTickRef = useRef(onTick);
  
  onTickRef.current = onTick;
  secondsRef.current = seconds;

  const start = useCallback(() => {
    const current = secondsRef.current;
    if (!isRunning && current > 0) {
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          const next = prev - 1;
          if (next >= 0) {
            onTickRef.current?.(next);
          }
          if (next <= 0) {
            setIsRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            onComplete?.();
            return 0;
          }
          return next;
        });
      }, 1000);
    }
  }, [isRunning, onComplete]);

  const pause = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback((newSeconds: number) => {
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
