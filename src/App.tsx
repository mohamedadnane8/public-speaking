import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WordReveal } from './components/WordReveal';
import './App.css';

const THINK_PRESETS = [15, 30, 45, 60] as const;
const SPEAK_PRESETS = [30, 60, 90, 120] as const;

// Refined topic list - single powerful words
const topics = [
  'COURAGE', 'CLARITY', 'PRESENCE', 'BALANCE', 'GROWTH',
  'VISION', 'PURPOSE', 'WISDOM', 'TRUTH', 'BEAUTY',
  'HARMONY', 'FREEDOM', 'STRENGTH', 'KINDNESS', 'PATIENCE',
  'FOCUS', 'TRUST', 'HOPE', 'JOY', 'PEACE',
  'LOVE', 'PASSION', 'GRACE', 'HUMILITY', 'RESILIENCE'
];

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
    filter.type = 'lowpass';
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
    osc.type = 'sine';
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
    osc.type = 'sine';
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
    osc.type = 'sine';
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
    osc.type = 'sine';
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
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }, []);

  return { init, playWhirr, playTick, playTock, playThum, playAmbientStart, playToneShift };
};

// Timer hook - use ref for seconds in start() so delayed start (e.g. after Repeat) sees latest value
const useTimer = (initialSeconds: number) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;

  const start = useCallback(() => {
    const current = secondsRef.current;
    if (!isRunning && current > 0) {
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [isRunning]);

  const pause = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback((newSeconds: number = initialSeconds) => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSeconds(newSeconds);
    secondsRef.current = newSeconds;
  }, [initialSeconds]);

  return { seconds, isRunning, start, pause, reset };
};

// Main App
function App() {
  const [screen, setScreen] = useState<'before' | 'revealing' | 'revealed' | 'timer'>('before');
  const [currentWord, setCurrentWord] = useState('');
  const [spinKey, setSpinKey] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showThink, setShowThink] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [phase, setPhase] = useState<'think' | 'speak'>('think');
  const [thinkSeconds, setThinkSeconds] = useState(30);
  const [speakSeconds, setSpeakSeconds] = useState(60);
  const [openPreset, setOpenPreset] = useState<'think' | 'speak' | null>(null);

  const thinkTimer = useTimer(30);
  const speakTimer = useTimer(60);
  const activeDuration = phase === 'think' ? thinkSeconds : speakSeconds;
  const activeSeconds = phase === 'think' ? thinkTimer.seconds : speakTimer.seconds;
  const progress = 1 - (activeSeconds / activeDuration);
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference * (1 - progress);
  
  const { init, playWhirr, playTick, playTock, playThum, playAmbientStart, playToneShift } = useSoundSystem();

  const handleSpin = () => {
    init();
    const randomIndex = Math.floor(Math.random() * topics.length);
    const newWord = topics[randomIndex];
    setCurrentWord(newWord);
    setSpinKey((k) => k + 1);
    setScreen('revealing');
    setIsRevealing(true);
    setShowThink(false);
    setShowButton(false);
    
    playWhirr();
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      playTick();
      tickCount++;
      if (tickCount > 25) clearInterval(tickInterval);
    }, 60);
  };

  const handleRevealComplete = () => {
    setIsRevealing(false);
    setScreen('revealed');
    playThum();
    setTimeout(() => setShowThink(true), 400);
    setTimeout(() => setShowButton(true), 700);
  };

  const handleStartThinking = () => {
    setScreen('timer');
    setPhase('think');
    thinkTimer.reset(thinkSeconds);
    speakTimer.reset(speakSeconds);
    playAmbientStart();
    setTimeout(() => thinkTimer.start(), 500);
  };

  const handleGoToSpeak = () => {
    thinkTimer.pause();
    setPhase('speak');
    speakTimer.reset(speakSeconds);
    playToneShift();
    setTimeout(() => speakTimer.start(), 300);
  };

  const handleBackToSpinner = () => {
    thinkTimer.reset(thinkSeconds);
    speakTimer.reset(speakSeconds);
    setScreen('before');
  };

  const handleRepeat = () => {
    speakTimer.reset(speakSeconds);
    setTimeout(() => speakTimer.start(), 200);
  };

  useEffect(() => {
    if (
      thinkTimer.seconds === 0 &&
      !thinkTimer.isRunning &&
      screen === 'timer' &&
      phase === 'think'
    ) {
      setPhase('speak');
      speakTimer.reset(speakSeconds);
      playToneShift();
      setTimeout(() => speakTimer.start(), 300);
    }
  }, [
    thinkTimer.seconds,
    thinkTimer.isRunning,
    screen,
    phase,
    speakSeconds,
    playToneShift,
    speakTimer.reset,
    speakTimer.start,
  ]);

  return (
    <div 
      className="min-h-screen bg-[#FDF6F0] selection:bg-[#1a1a1a]/15 selection:text-[#1a1a1a]"
      style={{ fontFamily: '"Inter", "Cormorant Garamond", sans-serif' }}
    >
      {/* Subtle branding - always visible */}
      <div className="absolute top-8 right-8 z-50">
        <span 
          className="text-[10px] tracking-[0.4em] text-[#1a1a1a]/30 uppercase"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 200 }}
        >
          @ADNANELOGS
        </span>
      </div>

      {/* Screen: Before Spin */}
      {screen === 'before' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="min-h-screen w-full flex flex-col items-center justify-center"
        >
          <div className="flex flex-col items-center space-y-12">
            {/* THINK / SPEAK — compact, architectural */}
            <div className="relative flex flex-col items-center">
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center justify-center gap-3">
                  <span
                    className="text-5xl uppercase tracking-[0.35em] text-[#1a1a1a]/75"
                    style={{ fontFamily: '"Inter", sans-serif',  fontWeight: 400 }}
                  >
                    Think
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenPreset((p) => (p === 'think' ? null : 'think'))}
                    className="text-xl tabular-nums text-[#1a1a1a]/50 hover:text-[#1a1a1a]/70 transition-colors"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    {thinkSeconds}s
                  </button>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <span
                    className="text-5xl uppercase tracking-[0.35em] text-[#1a1a1a]/75"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    Speak
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenPreset((p) => (p === 'speak' ? null : 'speak'))}
                    className="text-xl tabular-nums text-[#1a1a1a]/50 hover:text-[#1a1a1a]/70 transition-colors"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    {speakSeconds}s
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {openPreset && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      aria-hidden
                      onClick={() => setOpenPreset(null)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50 py-1.5 px-1 bg-[#FDF6F0] border border-[#1a1a1a]/12 rounded shadow-sm flex gap-0.5"
                    >
                      {(openPreset === 'think' ? THINK_PRESETS : SPEAK_PRESETS).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            if (openPreset === 'think') setThinkSeconds(s);
                            else setSpeakSeconds(s);
                            setOpenPreset(null);
                          }}
                          className={`min-w-[2.5rem] py-1 text-[11px] tracking-wide transition-colors ${
                            (openPreset === 'think' ? thinkSeconds === s : speakSeconds === s)
                              ? 'text-[#1a1a1a] font-medium'
                              : 'text-[#1a1a1a]/60 hover:text-[#1a1a1a]'
                          }`}
                          style={{ fontFamily: '"Inter", sans-serif' }}
                        >
                          {s}s
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Reel: dashes — spaced for breathing room */}
            <div 
              className="flex items-center justify-center text-6xl sm:text-7xl md:text-8xl lg:text-9xl gap-8 sm:gap-10 md:gap-12"
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

            <motion.button
              onClick={handleSpin}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              whileHover={{ backgroundColor: 'rgba(26, 26, 26, 0.08)' }}
              whileTap={{ scale: 0.98 }}
              className="px-12 py-4 border border-[#1a1a1a]/60 text-[#1a1a1a] text-xs tracking-[0.35em] uppercase transition-all duration-300 hover:border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#FDF6F0]"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              SPIN
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Screen: Revealing / Revealed */}
      {(screen === 'revealing' || screen === 'revealed') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="min-h-screen w-full flex flex-col items-center justify-center"
        >
          <div className="flex flex-col items-center space-y-8">
            {/* "Think." text */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: showThink ? 0.7 : 0, y: showThink ? 0 : -10 }}
              transition={{ duration: 0.5 }}
              className="h-6"
            >
              <span 
                className="text-sm tracking-[0.2em] text-[#1a1a1a]/80"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
              >
                Think. 
              </span>
            </motion.div>

            {/* Word reveal - key forces remount each spin so animation always runs */}
            <WordReveal 
              key={spinKey}
              word={currentWord} 
              isRevealing={isRevealing}
              onRevealComplete={handleRevealComplete}
              onLetterSettle={playTock}
            />

            {/* START THINKING + Respin */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: showButton ? 1 : 0, y: showButton ? 0 : 10 }}
              transition={{ duration: 0.5 }}
              className="pt-8 flex flex-col items-center gap-4"
            >
              <motion.button
                onClick={handleStartThinking}
                whileHover={{ backgroundColor: 'rgba(26, 26, 26, 0.92)' }}
                whileTap={{ scale: 0.98 }}
                className="px-10 py-4 bg-[#1a1a1a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                BEGIN
              </motion.button>
              <motion.button
                onClick={handleSpin}
                whileHover={{ backgroundColor: 'rgba(26, 26, 26, 0.06)' }}
                whileTap={{ scale: 0.98 }}
                className="text-[11px] tracking-[0.1.5em] uppercase text-[#1a1a1a]/55 hover:text-[#1a1a1a]/80 transition-colors"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                Spin again
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Screen: Timer */}
      {screen === 'timer' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen w-full flex flex-col items-center justify-center"
        >
          <div className="flex flex-col items-center space-y-8">
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
                {phase === 'think' ? 'Think.' : 'Speak.'}
              </span>
            </motion.div>

            {/* Word with circular timer - fixed height so circle doesn't overlap buttons */}
            <div className="relative min-h-[320px] sm:min-h-[360px] md:min-h-[400px] w-full flex flex-col items-center justify-center">
              <svg 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] md:w-[360px] md:h-[360px] pointer-events-none"
                viewBox="0 0 300 300"
                aria-hidden
              >
                {/* Outer circle - subtle track */}
                <circle
                  cx="150"
                  cy="150"
                  r="140"
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth="0.5"
                  strokeOpacity="0.12"
                />
                {/* Active progress - thicker, darker for depth */}
                <motion.circle
                  cx="150"
                  cy="150"
                  r="140"
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.3, ease: 'linear' }}
                  transform="rotate(-90 150 150)"
                  style={{ opacity: 0.55 }}
                />
              </svg>

              <div className="relative z-0 flex flex-col items-center gap-1">
                <div 
                  className="text-5xl sm:text-6xl md:text-7xl tracking-[0.12em] text-[#1a1a1a]"
                  style={{
                    fontFamily: '"Cormorant Garamond", Georgia, serif',
                    fontWeight: 400,
                    letterSpacing: '0.08em',
                  }}
                >
                  {currentWord}
                </div>
                {/* Small digital timer - muted; deep burgundy when ≤5 sec left */}
                <span
                  className={`text-xs tabular-nums tracking-widest transition-colors duration-300 ${
                    activeSeconds <= 5 ? 'text-[#5C3232]' : 'text-[#1a1a1a]/45'
                  }`}
                  style={{
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 300,
                  }}
                >
                  {Math.floor(activeSeconds / 60)}:{(activeSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Timer actions - below the circle, clearly separated */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-10 mt-2 relative z-10">
              {phase === 'think' ? (
                <motion.button
                  onClick={handleGoToSpeak}
                  whileHover={{ backgroundColor: 'rgba(26, 26, 26, 0.08)' }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-3 border border-[#1a1a1a]/60 text-[#1a1a1a] text-xs tracking-[0.25em] uppercase transition-all duration-300 hover:border-[#1a1a1a]"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  SPEAK
                </motion.button>
              ) : (
                <>
                  <motion.button
                    onClick={handleBackToSpinner}
                    whileHover={{ backgroundColor: 'rgba(26, 26, 26, 0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 border border-[#1a1a1a]/60 text-[#1a1a1a] text-xs tracking-[0.25em] uppercase transition-all duration-300 hover:border-[#1a1a1a]"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    New Word
                  </motion.button>
                  <motion.button
                    onClick={handleRepeat}
                    whileHover={{ backgroundColor: 'rgba(26, 26, 26, 0.92)' }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-[#1a1a1a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    Try Again
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default App;
