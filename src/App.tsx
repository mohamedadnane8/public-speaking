import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WordReveal } from "./components/WordReveal";
import { CircularProgress } from "./components/CircularProgress";
import { RatingDots } from "./components/RatingDots";
import { useAudioRecorder } from "./hooks/useAudioRecorder";
import { useSessionStorage } from "./hooks/useSessionStorage";
import { getModeConfig, getNextMode, type ModeConfig } from "./lib/modes";
import { getRandomWord } from "./lib/words";
import { calculateOverallScore, hasAllRatings } from "./lib/scoring";
import type { Screen, Session, SessionRatings, RatingValue } from "./types/session";
import "./App.css";

// Timer hook with tick callback
const useTimer = (initialSeconds: number, onComplete?: () => void, onTick?: (secondsLeft: number) => void) => {
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
};

// Sound system using Web Audio API
const useSoundSystem = () => {
  const ctxRef = useRef<AudioContext | null>(null);
  const isInitRef = useRef(false);

  const init = useCallback(() => {
    if (!isInitRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      isInitRef.current = true;
    }
  }, []);

  const playWhirr = useCallback(() => {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }, []);

  const playTick = useCallback(() => {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 180;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.025, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }, []);

  const playTock = useCallback(() => {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 220;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }, []);

  const playThum = useCallback(() => {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 80;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }, []);

  const playAmbientStart = useCallback(() => {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 120;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 2);
  }, []);

  const playToneShift = useCallback(() => {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 200;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }, []);

  const playCountdownTick = useCallback(() => {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 440;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }, []);

  return { init, playWhirr, playTick, playTock, playThum, playAmbientStart, playToneShift, playCountdownTick };
};

// Main App
function App() {
  // Screen state
  const [screen, setScreen] = useState<Screen>("HOME");
  
  // Session state
  const [session, setSession] = useState<Session | null>(null);
  const [currentWord, setCurrentWord] = useState("");
  const [modeConfig, setModeConfig] = useState<ModeConfig>(getModeConfig("EXPLANATION"));
  
  // Manual mode custom timings
  const [manualThinkSeconds, setManualThinkSeconds] = useState(30);
  const [manualSpeakSeconds, setManualSpeakSeconds] = useState(60);

  
  // Word reveal animation state
  const [spinKey, setSpinKey] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showWordActions, setShowWordActions] = useState(false);
  const [usedWords, setUsedWords] = useState<string[]>([]);

  // Rating state
  const [ratings, setRatings] = useState<Partial<SessionRatings>>({});
  const [notes, setNotes] = useState("");

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if recording is supported
  const isRecordingSupported = typeof window !== "undefined" && 
    window.isSecureContext && 
    typeof window.MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  // Recording permission state
  const [hasRecordingPermission, setHasRecordingPermission] = useState<boolean | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Hooks
  const { init, playWhirr, playTick, playTock, playThum, playAmbientStart, playToneShift, playCountdownTick } = useSoundSystem();
  const { audio, isRecording, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const { saveSession, updateSession } = useSessionStorage();
  const lastTickPlayedRef = useRef<number>(-1);

  // Get effective timings (manual mode uses custom values)
  const effectiveThinkSeconds = modeConfig.name === "MANUAL" ? manualThinkSeconds : modeConfig.thinkSeconds;
  const effectiveSpeakSeconds = modeConfig.name === "MANUAL" ? manualSpeakSeconds : modeConfig.speakSeconds;

  // Timers
  const thinkTimer = useTimer(
    effectiveThinkSeconds,
    () => {
      // Auto-transition to SPEAK when think timer completes
      transitionToSpeak();
    },
    (secondsLeft) => {
      // Play tick sound for each second in last 5 seconds
      if (secondsLeft <= 5 && secondsLeft > 0 && secondsLeft !== lastTickPlayedRef.current) {
        playCountdownTick();
        lastTickPlayedRef.current = secondsLeft;
      }
    }
  );
  
  const speakTimer = useTimer(
    effectiveSpeakSeconds,
    () => {
      // Auto-transition to PLAYBACK when speak timer completes
      transitionToPlayback();
    },
    (secondsLeft) => {
      // Play tick sound for each second in last 5 seconds
      if (secondsLeft <= 5 && secondsLeft > 0 && secondsLeft !== lastTickPlayedRef.current) {
        playCountdownTick();
        lastTickPlayedRef.current = secondsLeft;
      }
    }
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      thinkTimer.cleanup();
      speakTimer.cleanup();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Reset lastTickPlayed when entering/exiting timer screens
  useEffect(() => {
    if (screen === "THINK" || screen === "SPEAK") {
      lastTickPlayedRef.current = -1;
    }
  }, [screen]);

  // Handle app backgrounding
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && (screen === "THINK" || screen === "SPEAK")) {
        // Cancel session when app is backgrounded
        cancelSession("APP_BACKGROUND");
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [screen, session]);

  // ============ NAVIGATION / STATE TRANSITIONS ============

  const transitionToSpeak = useCallback(async () => {
    thinkTimer.pause();
    setScreen("SPEAK");
    lastTickPlayedRef.current = -1;
    speakTimer.reset(effectiveSpeakSeconds);
    playToneShift();
    
    // Start recording when entering SPEAK
    await startRecording();
    
    setTimeout(() => speakTimer.start(), 300);
  }, [effectiveSpeakSeconds, thinkTimer, speakTimer, playToneShift, startRecording]);

  const transitionToPlayback = useCallback(async () => {
    speakTimer.pause();
    
    // Stop recording
    await stopRecording();
    
    setScreen("PLAYBACK");
  }, [speakTimer, stopRecording]);

  const cancelSession = useCallback((reason: Session["cancelReason"]) => {
    thinkTimer.pause();
    speakTimer.pause();
    
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
    
    // Update session as cancelled
    if (session) {
      const cancelledSession: Session = {
        ...session,
        status: "CANCELLED",
        cancelReason: reason,
      };
      saveSession(cancelledSession);
    }
    
    // Reset and go home
    resetRecording();
    setSession(null);
    setRatings({});
    setScreen("HOME");
  }, [session, thinkTimer, speakTimer, isRecording, stopRecording, resetRecording, saveSession]);

  // ============ HOME SCREEN ============

  const handleModeCycle = () => {
    const nextMode = getNextMode(modeConfig.name);
    setModeConfig(getModeConfig(nextMode));
  };

  const handleManualTimeChange = (type: "think" | "speak", delta: number) => {
    if (type === "think") {
      setManualThinkSeconds((prev) => Math.max(5, Math.min(300, prev + delta)));
    } else {
      setManualSpeakSeconds((prev) => Math.max(5, Math.min(300, prev + delta)));
    }
  };

  const handleRequestRecordingPermission = async () => {
    if (!isRecordingSupported) return;
    
    setIsRequestingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop the stream - we just wanted to check permission
      stream.getTracks().forEach((track) => track.stop());
      setHasRecordingPermission(true);
    } catch (error) {
      console.error("Permission denied:", error);
      setHasRecordingPermission(false);
    }
    setIsRequestingPermission(false);
  };

  const handleSpin = () => {
    init();
    const newWord = getRandomWord(usedWords);
    setCurrentWord(newWord);
    setUsedWords((prev) => [...prev, newWord]);
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

  // ============ WORD REVEAL SCREEN ============

  const handleRevealComplete = () => {
    setIsRevealing(false);
    playThum();
    setTimeout(() => setShowWordActions(true), 400);
  };

  const handleSpinAgain = () => {
    handleSpin();
  };

  const handleStartSession = async () => {
    // Create new session
    const newSession: Session = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      mode: modeConfig.name,
      word: currentWord,
      thinkSeconds: effectiveThinkSeconds,
      speakSeconds: effectiveSpeakSeconds,
      status: "COMPLETED",
    };
    
    setSession(newSession);
    saveSession(newSession);
    
    // Transition to THINK
    setScreen("THINK");
    lastTickPlayedRef.current = -1;
    thinkTimer.reset(effectiveThinkSeconds);
    speakTimer.reset(effectiveSpeakSeconds);
    playAmbientStart();
    
    setTimeout(() => thinkTimer.start(), 500);
  };

  // ============ THINK SCREEN ============

  const handleThinkSkip = () => {
    transitionToSpeak();
  };

  // ============ SPEAK SCREEN ============

  // Handled by timer completion

  // ============ PLAYBACK SCREEN ============

  const handlePlayToggle = () => {
    if (!audio?.fileUri) return;
    
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(audio.fileUri);
        audioRef.current.onended = () => setIsPlaying(false);
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleContinueToReflect = () => {
    // Stop playback if playing
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
    
    setScreen("REFLECT");
  };

  // ============ REFLECT SCREEN ============

  const handleRateChange = (criteria: keyof SessionRatings, value: RatingValue) => {
    setRatings((prev) => ({ ...prev, [criteria]: value }));
  };

  const handleDoneRating = () => {
    if (!session || !hasAllRatings(ratings)) return;
    
    const overallScore = calculateOverallScore(ratings);
    
    const completedSession: Session = {
      ...session,
      ratings,
      overallScore,
      notes: notes.trim() || undefined,
      completedAt: new Date().toISOString(),
      audio: audio || { available: false },
    };
    
    setSession(completedSession);
    updateSession(session.id, completedSession);
    
    setScreen("SCORE_SUMMARY");
  };

  // ============ SCORE SUMMARY SCREEN ============

  const handleNewSession = () => {
    // Cleanup
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    resetRecording();
    setSession(null);
    setRatings({});
    setNotes("");
    setUsedWords([]);
    setHasRecordingPermission(null);
    setIsPlaying(false);
    
    setScreen("HOME");
  };

  const handleReplay = () => {
    if (!audio?.fileUri) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio(audio.fileUri);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
  };

  // ============ BACK NAVIGATION ============

  const handleBack = () => {
    if (screen === "WORD_REVEAL") {
      setScreen("HOME");
    } else if (screen === "THINK") {
      cancelSession("USER_BACK");
    } else if (screen === "SPEAK") {
      cancelSession("USER_BACK");
    } else if (screen === "PLAYBACK") {
      // Allow going back from playback to home (cancel session)
      cancelSession("USER_BACK");
    } else if (screen === "REFLECT") {
      // Go back to playback
      setScreen("PLAYBACK");
    } else if (screen === "SCORE_SUMMARY") {
      // Go to new session
      handleNewSession();
    }
  };

  // ============ RENDER ============

  const thinkProgress = 1 - thinkTimer.seconds / effectiveThinkSeconds;
  const speakProgress = 1 - speakTimer.seconds / effectiveSpeakSeconds;
  const canCompleteRating = hasAllRatings(ratings);



  return (
    <div
      className="min-h-screen bg-[#FDF6F0] selection:bg-[#1a1a1a]/15 selection:text-[#1a1a1a]"
      style={{ fontFamily: '"Inter", "Cormorant Garamond", sans-serif' }}
    >
      {/* Back button - shown on all screens except HOME */}
      {screen !== "HOME" && (
        <button
          type="button"
          onClick={handleBack}
          className="absolute top-8 left-8 z-50 p-2 text-[#1a1a1a]/50 hover:text-[#1a1a1a]/80 transition-colors"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Subtle branding */}
      <div className="absolute top-8 right-8 z-50">
        <span
          className="text-[10px] tracking-[0.4em] text-[#1a1a1a]/30 uppercase"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 300 }}
        >
          @ADNANELOGS
        </span>
      </div>

      <AnimatePresence mode="wait">
        {/* ============ HOME SCREEN ============ */}
        {screen === "HOME" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen w-full flex flex-col items-center justify-center"
          >
            <div className="flex flex-col items-center space-y-10 w-full max-w-[min(100%,28rem)] px-4">
              {/* Mode timing display */}
              <div className="flex flex-col items-center gap-6">
                {/* Think time */}
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <span
                    className="text-3xl sm:text-4xl md:text-5xl uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[#1a1a1a]/75"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    Think
                  </span>
                  {modeConfig.name === "MANUAL" ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleManualTimeChange("think", -5)}
                        className="w-6 h-6 flex items-center justify-center text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                      >
                        −
                      </button>
                      <span
                        className="text-base sm:text-xl tabular-nums text-[#1a1a1a]/70 min-w-[3rem] text-center"
                        style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                      >
                        {manualThinkSeconds}s
                      </span>
                      <button
                        type="button"
                        onClick={() => handleManualTimeChange("think", 5)}
                        className="w-6 h-6 flex items-center justify-center text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span
                      className="text-base sm:text-xl tabular-nums text-[#1a1a1a]/50"
                      style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                    >
                      {effectiveThinkSeconds}s
                    </span>
                  )}
                </div>

                {/* Speak time */}
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <span
                    className="text-3xl sm:text-4xl md:text-5xl uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[#1a1a1a]/75"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    Speak
                  </span>
                  {modeConfig.name === "MANUAL" ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleManualTimeChange("speak", -5)}
                        className="w-6 h-6 flex items-center justify-center text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                      >
                        −
                      </button>
                      <span
                        className="text-base sm:text-xl tabular-nums text-[#1a1a1a]/70 min-w-[3rem] text-center"
                        style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                      >
                        {manualSpeakSeconds}s
                      </span>
                      <button
                        type="button"
                        onClick={() => handleManualTimeChange("speak", 5)}
                        className="w-6 h-6 flex items-center justify-center text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span
                      className="text-base sm:text-xl tabular-nums text-[#1a1a1a]/50"
                      style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                    >
                      {effectiveSpeakSeconds}s
                    </span>
                  )}
                </div>
              </div>

              {/* Mode selector */}
              <button
                type="button"
                onClick={handleModeCycle}
                className="flex flex-col items-center gap-2 group"
              >
                <span
                  className="text-lg tracking-[0.15em] text-[#1a1a1a]/90 group-hover:text-[#1a1a1a] transition-colors"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}
                >
                  {modeConfig.name}
                </span>
                <span
                  className="text-xs tracking-[0.1em] text-[#1a1a1a]/45"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  Trains: {modeConfig.descriptor}
                </span>
              </button>

              {/* Decorative dashes */}
              <div
                className="flex items-center justify-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl gap-1.5 sm:gap-4 md:gap-6 lg:gap-8 w-fit max-w-full"
                style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontWeight: 300,
                }}
              >
                {[...Array(6)].map((_, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    className="text-[#1a1a1a]/50"
                  >
                    —
                  </motion.span>
                ))}
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-sm tracking-[0.15em] text-[#1a1a1a]/80"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
              >
                Spin the word.
              </motion.p>

              {/* Recording permission request */}
              {isRecordingSupported && hasRecordingPermission !== true && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="flex flex-col items-center gap-3"
                >
                  <motion.button
                    onClick={handleRequestRecordingPermission}
                    disabled={isRequestingPermission}
                    whileHover={{ backgroundColor: "rgba(122, 46, 46, 0.08)" }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 border border-[#7A2E2E]/60 text-[#7A2E2E] text-xs tracking-[0.25em] uppercase transition-all duration-300 hover:border-[#7A2E2E] hover:bg-[#7A2E2E] hover:text-[#FDF6F0] disabled:opacity-50"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    {isRequestingPermission ? "Requesting..." : "Enable Recording"}
                  </motion.button>
                  <span
                    className="text-[10px] tracking-[0.1em] text-[#1a1a1a]/40 text-center"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    {hasRecordingPermission === false 
                      ? "Permission denied — you can still practice without recording" 
                      : "Required to review your practice"}
                  </span>
                </motion.div>
              )}

              {/* Recording granted indicator */}
              {isRecordingSupported && hasRecordingPermission === true && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-[#2E7A4E]" />
                  <span
                    className="text-[10px] tracking-[0.15em] uppercase text-[#2E7A4E]/80"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    Recording enabled
                  </span>
                </motion.div>
              )}

              <motion.button
                onClick={handleSpin}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.08)" }}
                whileTap={{ scale: 0.98 }}
                className="px-12 py-4 border border-[#1a1a1a]/60 text-[#1a1a1a] text-xs tracking-[0.35em] uppercase transition-all duration-300 hover:border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#FDF6F0]"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                SPIN
              </motion.button>

              {/* Recording warning */}
              {!isRecordingSupported && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="text-[10px] tracking-[0.1em] text-[#7A2E2E]/70 text-center"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  Recording not available — use HTTPS or enable microphone permissions
                </motion.p>
              )}
            </div>
          </motion.div>
        )}

        {/* ============ WORD REVEAL SCREEN ============ */}
        {screen === "WORD_REVEAL" && (
          <motion.div
            key="word-reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen w-full flex flex-col items-center justify-center px-4"
          >
            <div className="flex flex-col items-center space-y-8 w-full max-w-[min(100%,32rem)]">
              {/* Mode indicator */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 0.6, y: 0 }}
                transition={{ duration: 0.5 }}
                className="h-6"
              >
                <span
                  className="text-xs tracking-[0.2em] text-[#1a1a1a]/60 uppercase"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  {modeConfig.name}
                </span>
              </motion.div>

              {/* Word reveal */}
              <WordReveal
                key={spinKey}
                word={currentWord}
                isRevealing={isRevealing}
                onRevealComplete={handleRevealComplete}
                onLetterSettle={playTock}
              />

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: showWordActions ? 1 : 0, y: showWordActions ? 0 : 10 }}
                transition={{ duration: 0.5 }}
                className="pt-8 flex flex-col items-center gap-4"
              >
                <motion.button
                  onClick={handleStartSession}
                  whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.92)" }}
                  whileTap={{ scale: 0.98 }}
                  className="px-10 py-4 bg-[#1a1a1a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  START
                </motion.button>
                <motion.button
                  onClick={handleSpinAgain}
                  whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.06)" }}
                  whileTap={{ scale: 0.98 }}
                  className="text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a]/55 hover:text-[#1a1a1a]/80 transition-colors"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  Spin again
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ============ THINK SCREEN ============ */}
        {screen === "THINK" && (
          <motion.div
            key="think"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen w-full flex flex-col items-center justify-center px-4"
          >
            <div className="flex flex-col items-center space-y-10 w-full max-w-[min(100%,32rem)]">
              {/* Phase indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-6"
              >
                <span
                  className="text-sm tracking-[0.2em] text-[#1a1a1a]/80"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
                >
                  Think.
                </span>
              </motion.div>

              {/* Word with circular timer */}
              <div className="min-h-[320px] sm:min-h-[360px] md:min-h-[400px] w-full flex flex-col items-center justify-center">
                <CircularProgress
                  progress={thinkProgress}
                  seconds={thinkTimer.seconds}
                  isLowTime={thinkTimer.seconds <= 5}
                  size="md"
                >
                  <div
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-[0.08em] sm:tracking-[0.12em] text-[#1a1a1a] px-2"
                    style={{
                      fontFamily: '"Cormorant Garamond", Georgia, serif',
                      fontWeight: 400,
                    }}
                  >
                    {currentWord}
                  </div>
                </CircularProgress>
              </div>

              {/* Skip button */}
              <motion.button
                onClick={handleThinkSkip}
                whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.08)" }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 border border-[#1a1a1a]/60 text-[#1a1a1a] text-xs tracking-[0.25em] uppercase transition-all duration-300 hover:border-[#1a1a1a]"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                SPEAK
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ============ SPEAK SCREEN ============ */}
        {screen === "SPEAK" && (
          <motion.div
            key="speak"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen w-full flex flex-col items-center justify-center px-4"
          >
            <div className="flex flex-col items-center space-y-8 w-full max-w-[min(100%,32rem)]">
              {/* Phase indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-6"
              >
                <span
                  className="text-sm tracking-[0.2em] text-[#1a1a1a]/80"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
                >
                  Speak.
                </span>
              </motion.div>

              {/* Word with circular timer and recording indicator inside */}
              <div className="min-h-[320px] sm:min-h-[360px] md:min-h-[400px] w-full flex flex-col items-center justify-center">
                <CircularProgress
                  progress={speakProgress}
                  seconds={speakTimer.seconds}
                  isLowTime={speakTimer.seconds <= 5}
                  size="md"
                >
                  <div
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-[0.08em] sm:tracking-[0.12em] text-[#1a1a1a] px-2"
                    style={{
                      fontFamily: '"Cormorant Garamond", Georgia, serif',
                      fontWeight: 400,
                    }}
                  >
                    {currentWord}
                  </div>
                  
                  {/* Recording indicator - inside the circle below the word */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 mt-3"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className={`w-2 h-2 rounded-full ${isRecording ? "bg-[#7A2E2E]" : "bg-[#1a1a1a]/30"}`}
                    />
                    <span
                      className="text-[10px] tracking-[0.2em] uppercase text-[#1a1a1a]/50"
                      style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                    >
                      {isRecording ? "Recording" : audio?.available === false ? "No recording" : "Starting..."}
                    </span>
                  </motion.div>
                </CircularProgress>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============ PLAYBACK SCREEN ============ */}
        {screen === "PLAYBACK" && (
          <motion.div
            key="playback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen w-full flex flex-col items-center justify-center px-4"
          >
            <div className="flex flex-col items-center space-y-10 w-full max-w-[min(100%,32rem)]">
              {/* Word */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <span
                  className="text-4xl sm:text-5xl md:text-6xl tracking-[0.08em] text-[#1a1a1a]"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
                >
                  {currentWord}
                </span>
              </motion.div>

              {/* Mode indicator */}
              <span
                className="text-xs tracking-[0.2em] text-[#1a1a1a]/50 uppercase"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                {modeConfig.name}
              </span>

              {/* Playback controls */}
              <div className="flex flex-col items-center gap-6">
                {audio?.available && audio.fileUri ? (
                  <motion.button
                    onClick={handlePlayToggle}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-12 py-4 bg-[#1a1a1a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    {isPlaying ? "PAUSE" : "PLAY"}
                  </motion.button>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className="text-sm text-[#1a1a1a]/50"
                      style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                    >
                      Recording unavailable
                    </span>
                    {audio?.errorCode && (
                      <span
                        className="text-[10px] text-[#1a1a1a]/30"
                        style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                      >
                        {audio.errorCode === "MIC_PERMISSION" && "Microphone permission denied"}
                        {audio.errorCode === "REC_START_FAIL" && "Failed to start recording"}
                        {audio.errorCode === "REC_STOP_FAIL" && "Failed to save recording"}
                        {audio.errorCode === "NO_AUDIO" && "No audio captured"}
                        {audio.errorCode === "INTERRUPTED" && "Recording interrupted"}
                      </span>
                    )}
                  </div>
                )}

                <motion.button
                  onClick={handleContinueToReflect}
                  whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.06)" }}
                  whileTap={{ scale: 0.98 }}
                  className="text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a]/55 hover:text-[#1a1a1a]/80 transition-colors"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  Continue
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============ REFLECT SCREEN ============ */}
        {screen === "REFLECT" && (
          <motion.div
            key="reflect"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen w-full flex flex-col items-center justify-center px-4"
          >
            <div className="flex flex-col items-center space-y-12 w-full max-w-[min(100%,32rem)]">
              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span
                  className="text-sm tracking-[0.2em] text-[#1a1a1a]/80"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
                >
                  Reflect.
                </span>
              </motion.div>

              {/* Rating criteria */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center gap-8"
              >
                <RatingDots
                  label="Structure"
                  value={ratings.structure}
                  onChange={(v) => handleRateChange("structure", v)}
                />
                <RatingDots
                  label="Opening"
                  value={ratings.opening}
                  onChange={(v) => handleRateChange("opening", v)}
                />
                <RatingDots
                  label="Clarity"
                  value={ratings.clarity}
                  onChange={(v) => handleRateChange("clarity", v)}
                />
                <RatingDots
                  label="Language & Expression"
                  value={ratings.languageExpression}
                  onChange={(v) => handleRateChange("languageExpression", v)}
                />
            
                <RatingDots
                  label="Authenticity"
                  value={ratings.authenticity}
                  onChange={(v) => handleRateChange("authenticity", v)}
                />
                <RatingDots
                  label="Confidence"
                  value={ratings.confidence}
                  onChange={(v) => handleRateChange("confidence", v)}
                />
                <RatingDots
                  label="Ending"
                  value={ratings.ending}
                  onChange={(v) => handleRateChange("ending", v)}
                />
              </motion.div>

              {/* Notes textarea */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full max-w-sm"
              >
                <label
                  className="block text-xs tracking-[0.2em] uppercase text-[#1a1a1a]/60 mb-3 text-center"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your thoughts..."
                  rows={4}
                  className="w-full px-4 py-3 bg-transparent border border-[#1a1a1a]/20 text-sm text-[#1a1a1a]/80 placeholder:text-[#1a1a1a]/30 resize-none focus:outline-none focus:border-[#1a1a1a]/50 transition-colors"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                />
              </motion.div>

              {/* Done button */}
              <motion.button
                onClick={handleDoneRating}
                disabled={!canCompleteRating}
                initial={{ opacity: 0 }}
                animate={{ opacity: canCompleteRating ? 1 : 0.4 }}
                whileHover={canCompleteRating ? { backgroundColor: "rgba(26, 26, 26, 0.92)" } : {}}
                whileTap={canCompleteRating ? { scale: 0.98 } : {}}
                className={`px-10 py-4 text-xs tracking-[0.25em] uppercase transition-all duration-300 ${
                  canCompleteRating
                    ? "bg-[#1a1a1a] text-[#FDF6F0]/90 cursor-pointer"
                    : "bg-[#1a1a1a]/30 text-[#FDF6F0]/60 cursor-not-allowed"
                }`}
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                DONE
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ============ SCORE SUMMARY SCREEN ============ */}
        {screen === "SCORE_SUMMARY" && session?.overallScore !== undefined && (
          <motion.div
            key="score-summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen w-full flex flex-col items-center justify-center px-4"
          >
            <div className="flex flex-col items-center space-y-12 w-full max-w-[min(100%,32rem)]">
              {/* Score display */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center gap-4"
              >
                <span
                  className="text-sm tracking-[0.2em] text-[#1a1a1a]/60"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
                >
                  Overall Score
                </span>
                <span
                  className="text-7xl sm:text-8xl md:text-9xl tracking-[0.05em] text-[#1a1a1a]"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
                >
                  {session.overallScore.toFixed(1)}
                </span>
                <span
                  className="text-xs tracking-[0.15em] text-[#1a1a1a]/40"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  out of 10
                </span>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.button
                  onClick={handleNewSession}
                  whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.92)" }}
                  whileTap={{ scale: 0.98 }}
                  className="px-12 py-4 bg-[#1a1a1a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  NEW SESSION
                </motion.button>
                
                {audio?.available && audio.fileUri && (
                  <motion.button
                    onClick={handleReplay}
                    whileHover={{ backgroundColor: "rgba(26, 26, 26, 0.06)" }}
                    whileTap={{ scale: 0.98 }}
                    className="text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a]/55 hover:text-[#1a1a1a]/80 transition-colors"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    Replay Recording
                  </motion.button>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
