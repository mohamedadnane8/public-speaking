import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { useTimer } from "./hooks/useTimer";
import { useSoundSystem } from "./hooks/useSoundSystem";
import { useSession } from "./hooks/useSession";
import { useTranscription, isTranscriptionSupported } from "./hooks/useTranscription";
import { getModeConfig, getNextMode } from "./lib/modes";
import { getRandomWord } from "./lib/words";
import { calculateOverallScore, hasAllRatings } from "./lib/scoring";
import type { Screen, SessionRatings, RatingValue } from "./types/session";

// Screens
import { HomeScreen } from "./screens/HomeScreen";
import { WordRevealScreen } from "./screens/WordRevealScreen";
import { ThinkScreen } from "./screens/ThinkScreen";
import { SpeakScreen } from "./screens/SpeakScreen";
import { PlaybackScreen } from "./screens/PlaybackScreen";
import { ReflectScreen } from "./screens/ReflectScreen";
import { ScoreSummaryScreen } from "./screens/ScoreSummaryScreen";

import "./App.css";

// Check if recording is supported
const isRecordingSupported =
  typeof window !== "undefined" &&
  window.isSecureContext &&
  typeof window.MediaRecorder !== "undefined" &&
  typeof navigator !== "undefined" &&
  typeof navigator.mediaDevices !== "undefined" &&
  typeof navigator.mediaDevices.getUserMedia === "function";

function App() {
  // Screen state
  const [screen, setScreen] = useState<Screen>("HOME");

  // Mode configuration
  const [modeConfig, setModeConfig] = useState(getModeConfig("EXPLANATION"));
  const [manualThinkSeconds, setManualThinkSeconds] = useState(30);
  const [manualSpeakSeconds, setManualSpeakSeconds] = useState(60);

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
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

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
    audio,
    isRecording,
    usedWords,
    createSession,
    completeSession,
    cancelSession,
    startRecording,
    stopRecording,
    resetRecording,
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

  // Effective timings
  const effectiveThinkSeconds = modeConfig.name === "MANUAL" ? manualThinkSeconds : modeConfig.thinkSeconds;
  const effectiveSpeakSeconds = modeConfig.name === "MANUAL" ? manualSpeakSeconds : modeConfig.speakSeconds;

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
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
    if (screen === "THINK" || screen === "SPEAK") {
      lastTickPlayedRef.current = -1;
    }
  }, [screen]);

  // Handle app backgrounding
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && (screen === "THINK" || screen === "SPEAK")) {
        handleCancel("APP_BACKGROUND");
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
      startTranscription();
    }
    setTimeout(() => speakTimer.start(), 300);
  }, [effectiveSpeakSeconds, thinkTimer, speakTimer, playToneShift, startRecording, startTranscription]);

  const transitionToPlayback = useCallback(async () => {
    speakTimer.pause();
    await stopRecording();
    stopTranscription();
    setScreen("PLAYBACK");
  }, [speakTimer, stopRecording, stopTranscription]);

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
  };

  // Home screen handlers
  const handleModeCycle = () => {
    setModeConfig(getModeConfig(getNextMode(modeConfig.name)));
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

  const handleSpin = () => {
    init();
    const newWord = getRandomWord(usedWords);
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
    createSession(modeConfig.name, currentWord, effectiveThinkSeconds, effectiveSpeakSeconds);
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
    setScreen("SCORE_SUMMARY");
  };

  // Score summary handlers
  const handleNewSession = () => {
    resetState();
    resetUsedWords();
    setHasRecordingPermission(null);
    setScreen("HOME");
  };

  // Google OAuth and save handler
  const handleSaveAndGetAdvice = useCallback(async () => {
    if (!googleClientId) {
      toast.error("Google OAuth not configured");
      return;
    }

    setIsSaving(true);

    try {
      // Load Google Identity Services script if not already loaded
      if (!(window as unknown as { google?: unknown }).google) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Google script"));
          document.body.appendChild(script);
        });
      }

      const google = (window as unknown as { google: { accounts: { oauth2: { initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string; error?: string }) => void;
      }) => { requestAccessToken: () => void } } } } }).google;

      // Initialize Google OAuth client
      const client = google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: "openid email profile",
        callback: async (response) => {
          if (response.error) {
            toast.error("Google sign-in failed");
            setIsSaving(false);
            return;
          }

          try {
            // Step 1: Authenticate with Google (idToken only)
            const authRes = await fetch("http://localhost:5000/api/auth/google", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                idToken: response.access_token,
              }),
            });

            if (!authRes.ok) {
              throw new Error("Authentication failed");
            }

            const authData = await authRes.json();
            
            // Step 2: Save session with auth token
            const saveRes = await fetch("http://localhost:5000/api/sessions/record", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authData.token}`,
              },
              body: JSON.stringify(session),
            });

            if (!saveRes.ok) {
              throw new Error("Failed to save session");
            }

            const saveData = await saveRes.json();
            toast.success("Session saved! Check your email for advice.");
            
            // Optionally show advice if returned immediately
            if (saveData.advice) {
              toast.info(saveData.advice, { duration: 10000 });
            }
          } catch (error) {
            toast.error("Failed to save session. Please try again.");
            console.error("Save error:", error);
          } finally {
            setIsSaving(false);
          }
        },
      });

      // Trigger Google OAuth popup
      client.requestAccessToken();
    } catch (error) {
      toast.error("Something went wrong");
      console.error("OAuth error:", error);
      setIsSaving(false);
    }
  }, [googleClientId, session]);

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

  // Back navigation
  const handleBack = () => {
    switch (screen) {
      case "WORD_REVEAL":
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
    }
  };

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
      {/* Back button */}
      {screen !== "HOME" && (
        <button
          type="button"
          onClick={handleBack}
          className="absolute top-8 left-8 z-50 p-2 text-[#1a1a1a]/50 hover:text-[#1a1a1a]/80 transition-colors"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Branding */}
      <div className="absolute top-8 right-8 z-50">
        <span
          className="text-[10px] tracking-[0.4em] text-[#1a1a1a]/30 uppercase"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 300 }}
        >
          @ADNANELOGS
        </span>
      </div>

      <AnimatePresence mode="wait">
        {screen === "HOME" && (
          <HomeScreen
            modeConfig={modeConfig}
            manualThinkSeconds={manualThinkSeconds}
            manualSpeakSeconds={manualSpeakSeconds}
            isRecordingSupported={isRecordingSupported}
            hasRecordingPermission={hasRecordingPermission}
            isRequestingPermission={isRequestingPermission}
            onModeCycle={handleModeCycle}
            onManualTimeChange={handleManualTimeChange}
            onRequestPermission={handleRequestPermission}
            onSpin={handleSpin}
          />
        )}

        {screen === "WORD_REVEAL" && (
          <WordRevealScreen
            word={currentWord}
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
            isSaving={isSaving}
            onNewSession={handleNewSession}
            onReplay={handleReplay}
            onSaveAndGetAdvice={handleSaveAndGetAdvice}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
