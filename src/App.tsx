import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { WordReveal } from './components/WordReveal';
import './App.css';

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

// Timer hook
const useTimer = (initialSeconds: number) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (!isRunning && seconds > 0) {
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
  }, [isRunning, seconds]);

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
  }, [initialSeconds]);

  return { seconds, isRunning, start, pause, reset };
};

// Main App
function App() {
  const [screen, setScreen] = useState<'before' | 'revealing' | 'revealed' | 'timer'>('before');
  const [currentWord, setCurrentWord] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);
  const [showThink, setShowThink] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [phase, setPhase] = useState<'think' | 'speak'>('think');
  
  const { seconds, isRunning, start } = useTimer(60);
  const progress = 1 - (seconds / 60);
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference * (1 - progress);
  
  const { init, playWhirr, playTick, playTock, playThum, playAmbientStart, playToneShift } = useSoundSystem();

  const handleSpin = () => {
    init();
    const randomIndex = Math.floor(Math.random() * topics.length);
    const newWord = topics[randomIndex];
    setCurrentWord(newWord);
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
    playAmbientStart();
    setTimeout(() => start(), 500);
  };

  useEffect(() => {
    if (seconds === 0 && !isRunning && screen === 'timer' && phase === 'think') {
      setPhase('speak');
      playToneShift();
    }
  }, [seconds, isRunning, screen, phase, playToneShift]);

  return (
    <div 
      className="min-h-screen bg-[#FDF6F0] selection:bg-[#1a3a2a]/15 selection:text-[#1a3a2a]"
      style={{ fontFamily: '"Inter", "Cormorant Garamond", sans-serif' }}
    >
      {/* Subtle branding - always visible */}
      <div className="absolute top-8 right-8 z-50">
        <span 
          className="text-[10px] tracking-[0.4em] text-[#1a3a2a]/30 uppercase"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 200 }}
        >
          IMPROTU
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
            {/* Empty columns with dashes */}
            <div className="flex items-center justify-center text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-[0.12em]">
              {[...Array(7)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="relative h-[1.1em] w-[0.7em] overflow-hidden"
                >
                  <span 
                    className="absolute inset-0 flex items-center justify-center text-[#1a3a2a]/50"
                    style={{
                      fontFamily: '"Cormorant Garamond", Georgia, serif',
                      fontWeight: 300,
                      letterSpacing: '0.08em',
                    }}
                  >
                    —
                  </span>
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-sm tracking-[0.15em] text-[#1a3a2a]/80"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
            >
              Spin the word.
            </motion.p>

            <motion.button
              onClick={handleSpin}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              whileHover={{ backgroundColor: 'rgba(26, 58, 42, 0.1)' }}
              whileTap={{ scale: 0.98 }}
              className="px-12 py-4 border border-[#1a3a2a]/60 text-[#1a3a2a] text-xs tracking-[0.35em] uppercase transition-all duration-300 hover:border-[#1a3a2a] hover:bg-[#1a3a2a] hover:text-[#FDF6F0]"
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
                className="text-sm tracking-[0.2em] text-[#1a3a2a]/80"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
              >
                Think.
              </span>
            </motion.div>

            {/* Word reveal */}
            <WordReveal 
              word={currentWord} 
              isRevealing={isRevealing}
              onRevealComplete={handleRevealComplete}
              onLetterSettle={playTock}
            />

            {/* START THINKING button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: showButton ? 1 : 0, y: showButton ? 0 : 10 }}
              transition={{ duration: 0.5 }}
              className="pt-8"
            >
              <motion.button
                onClick={handleStartThinking}
                whileHover={{ backgroundColor: 'rgba(26, 58, 42, 0.95)' }}
                whileTap={{ scale: 0.98 }}
                className="px-10 py-4 bg-[#1a3a2a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                START THINKING
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
                className="text-sm tracking-[0.2em] text-[#1a3a2a]/80"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
              >
                {phase === 'think' ? 'Think.' : 'Speak.'}
              </span>
            </motion.div>

            {/* Word with circular timer */}
            <div className="relative">
              <svg 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] md:w-[360px] md:h-[360px]"
                viewBox="0 0 300 300"
              >
                <circle
                  cx="150"
                  cy="150"
                  r="140"
                  fill="none"
                  stroke="#1a3a2a"
                  strokeWidth="0.5"
                  strokeOpacity="0.15"
                />
                <motion.circle
                  cx="150"
                  cy="150"
                  r="140"
                  fill="none"
                  stroke="#1a3a2a"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.3, ease: 'linear' }}
                  transform="rotate(-90 150 150)"
                  style={{ opacity: 0.4 }}
                />
              </svg>

              <div 
                className="text-5xl sm:text-6xl md:text-7xl tracking-[0.12em] text-[#1a3a2a]"
                style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontWeight: 400,
                  letterSpacing: '0.08em',
                }}
              >
                {currentWord}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default App;
