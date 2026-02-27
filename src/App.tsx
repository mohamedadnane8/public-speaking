import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useTimer } from "./hooks/useTimer";
import { useSoundSystem } from "./hooks/useSoundSystem";
import { useSession } from "./hooks/useSession";
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    };
  }, []);

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
    setTimeout(() => speakTimer.start(), 300);
  }, [effectiveSpeakSeconds, thinkTimer, speakTimer, playToneShift, startRecording]);

  const transitionToPlayback = useCallback(async () => {
    speakTimer.pause();
    await stopRecording();
    setScreen("PLAYBACK");
  }, [speakTimer, stopRecording]);

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
    resetRecording();
    setRatings({});
    setNotes("");
    setIsPlaying(false);
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
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Reflect handlers
  const handleRateChange = (criteria: keyof SessionRatings, value: RatingValue) => {
    setRatings((prev) => ({ ...prev, [criteria]: value }));
  };

  const handleDoneRating = () => {
    if (!hasAllRatings(ratings)) return;
    const overallScore = calculateOverallScore(ratings);
    completeSession(ratings, overallScore, notes);
    setScreen("SCORE_SUMMARY");
  };

  // Score summary handlers
  const handleNewSession = () => {
    resetState();
    resetUsedWords();
    setHasRecordingPermission(null);
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
          />
        )}

        {screen === "PLAYBACK" && (
          <PlaybackScreen
            word={currentWord}
            modeConfig={modeConfig}
            audio={audio}
            isPlaying={isPlaying}
            onPlayToggle={handlePlayToggle}
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
            onNewSession={handleNewSession}
            onReplay={handleReplay}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
