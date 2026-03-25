import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import type { Screen } from "../types/session";
import type { NavSection } from "../components/TopNavbar";

interface AppContextValue {
  // Screen
  screen: Screen;
  setScreen: (screen: Screen) => void;
  section: NavSection;
  showNavbar: boolean;

  // Auth callback
  isAuthSuccessPage: boolean;
  isAuthErrorPage: boolean;
  authError: string | null;
  clearAuthParams: () => void;

  // Auth (from useAuth)
  user: ReturnType<typeof useAuth>["user"];
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isLocalhostEnv: boolean;
  login: ReturnType<typeof useAuth>["login"];
  devLogin: ReturnType<typeof useAuth>["devLogin"];
  logout: ReturnType<typeof useAuth>["logout"];
  refreshUser: ReturnType<typeof useAuth>["refreshUser"];

  // Account menu
  isAccountMenuOpen: boolean;
  setIsAccountMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  accountMenuRef: React.RefObject<HTMLDivElement | null>;

  // Playback
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  duration: number;
  setDuration: React.Dispatch<React.SetStateAction<number>>;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  audioSrcRef: React.MutableRefObject<string | null>;
  handlePlayToggle: (fileUri?: string) => void;
  handleSeek: (time: number) => void;
  handleSkipBackward: () => void;
  handleSkipForward: () => void;
  handleReplay: (fileUri?: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Screen state
  const [screen, setScreen] = useState<Screen>("HOME");

  // Auth callback
  const urlParams = new URLSearchParams(window.location.search);
  const authError = urlParams.get("error");
  const authSuccess = urlParams.get("auth") === "success";

  const [isAuthSuccessPage, setIsAuthSuccessPage] = useState(
    () => authSuccess || window.location.pathname === "/auth/success"
  );
  const [isAuthErrorPage, setIsAuthErrorPage] = useState(
    () => authError !== null || window.location.pathname === "/auth/error"
  );

  const clearAuthParams = useCallback(() => {
    const newUrl = window.location.pathname.replace(/\/auth\/(success|error)/, "") || "/";
    window.history.replaceState({}, document.title, newUrl);
    setIsAuthSuccessPage(false);
    setIsAuthErrorPage(false);
  }, []);

  // Auth
  const { user, isAuthenticated, isLoading: isAuthLoading, isLocalhost: isLocalhostEnv, login, devLogin, logout, refreshUser } = useAuth();

  // Account menu
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!accountMenuRef.current) return;
      const target = event.target as Node;
      if (!accountMenuRef.current.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAccountMenuOpen]);

  useEffect(() => {
    if (!isAuthenticated) setIsAccountMenuOpen(false);
  }, [isAuthenticated]);

  // Derived
  const section: NavSection = useMemo(() => {
    if (screen.startsWith("INTERVIEW_")) return "INTERVIEWS";
    if (screen === "HISTORY") return "HISTORY";
    if (screen === "FEATURE_REQUEST") return "FEATURE_REQUEST";
    return "GENERAL_PRACTICE";
  }, [screen]);

  const showNavbar = !isAuthSuccessPage && !isAuthErrorPage;

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioSrcRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      audioSrcRef.current = null;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Helper: create or reuse an Audio element for the given fileUri
  const ensureAudioElement = useCallback((fileUri: string) => {
    // If the source changed, tear down the old element and create a new one
    if (audioRef.current && audioSrcRef.current !== fileUri) {
      audioRef.current.pause();
      audioRef.current = null;
      audioSrcRef.current = null;
      setCurrentTime(0);
      setDuration(0);
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(fileUri);
      audioSrcRef.current = fileUri;
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => {
        console.error("Audio playback error for source:", fileUri);
        setIsPlaying(false);
      };
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current?.duration || 0);
      };
    }
    return audioRef.current;
  }, []);

  const handlePlayToggle = useCallback((fileUri?: string) => {
    if (!fileUri) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      const audio = ensureAudioElement(fileUri);
      audio.play().catch((err) => {
        console.error("Audio play() failed:", err);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  }, [isPlaying, ensureAudioElement]);

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(audioRef.current.currentTime);
    }
  }, [duration]);

  const handleSkipBackward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleSkipForward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
      setCurrentTime(audioRef.current.currentTime);
    }
  }, [duration]);

  const handleReplay = useCallback((fileUri?: string) => {
    if (!fileUri) return;
    const audio = ensureAudioElement(fileUri);
    audio.currentTime = 0;
    setCurrentTime(0);
    audio.play().catch((err) => {
      console.error("Audio replay() failed:", err);
      setIsPlaying(false);
    });
    setIsPlaying(true);
  }, [ensureAudioElement]);

  const value = useMemo<AppContextValue>(() => ({
    screen, setScreen, section, showNavbar,
    isAuthSuccessPage, isAuthErrorPage, authError, clearAuthParams,
    user, isAuthenticated, isAuthLoading, isLocalhostEnv, login, devLogin, logout, refreshUser,
    isAccountMenuOpen, setIsAccountMenuOpen, accountMenuRef,
    isPlaying, setIsPlaying, currentTime, setCurrentTime, duration, setDuration, audioRef, audioSrcRef,
    handlePlayToggle, handleSeek, handleSkipBackward, handleSkipForward, handleReplay,
  }), [
    screen, section, showNavbar,
    isAuthSuccessPage, isAuthErrorPage, authError, clearAuthParams,
    user, isAuthenticated, isAuthLoading, isLocalhostEnv, login, devLogin, logout, refreshUser,
    isAccountMenuOpen, accountMenuRef,
    isPlaying, currentTime, duration,
    handlePlayToggle, handleSeek, handleSkipBackward, handleSkipForward, handleReplay,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
