import { useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";

import { AppProvider, useAppContext } from "./contexts/AppContext";
import { SessionProvider } from "./contexts/SessionContext";
import { PracticeProvider, usePracticeContext } from "./contexts/PracticeContext";
import { InterviewProvider, useInterviewContext } from "./contexts/InterviewContext";

import { TopNavbar } from "./components/TopNavbar";
import type { NavSection } from "./components/TopNavbar";
import { GeneralFlow } from "./components/GeneralFlow";
import { InterviewFlow } from "./components/InterviewFlow";
import { UtilityScreens } from "./components/UtilityScreens";

import "./App.css";

function App() {
  return (
    <AppProvider>
      <SessionProvider>
        <PracticeProvider>
          <InterviewProvider>
            <AppLayout />
          </InterviewProvider>
        </PracticeProvider>
      </SessionProvider>
    </AppProvider>
  );
}

function AppLayout() {
  const app = useAppContext();
  const practice = usePracticeContext();
  const iv = useInterviewContext();

  const handleLogout = useCallback(async () => {
    try {
      await app.logout();
      toast.success("Logged out");
      app.setScreen("HOME");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to log out");
    } finally {
      app.setIsAccountMenuOpen(false);
    }
  }, [app]);

  const handleNavNavigate = useCallback((navSection: NavSection) => {
    const { screen } = app;
    if (["THINK", "SPEAK", "PLAYBACK", "REFLECT"].includes(screen)) {
      practice.handleCancel("USER_BACK");
    }
    if (["INTERVIEW_THINK", "INTERVIEW_SPEAK", "INTERVIEW_PLAYBACK", "INTERVIEW_REFLECT"].includes(screen)) {
      iv.handleInterviewCancel();
    }
    switch (navSection) {
      case "GENERAL_PRACTICE": app.setScreen("HOME"); break;
      case "INTERVIEWS": app.setScreen("INTERVIEW_HOME"); break;
      case "HISTORY": app.setScreen("HISTORY"); break;
      case "FEATURE_REQUEST": app.setScreen("FEATURE_REQUEST"); break;
    }
  }, [app, practice, iv]);

  const handleBack = useCallback(() => {
    switch (app.screen) {
      case "WORD_REVEAL": app.setScreen("HOME"); break;
      case "HISTORY": app.setScreen("HOME"); break;
      case "FEATURE_REQUEST": app.setScreen("HOME"); break;
      case "THINK":
      case "SPEAK":
      case "PLAYBACK":
        practice.handleCancel("USER_BACK"); break;
      case "REFLECT": app.setScreen("PLAYBACK"); break;
      case "SCORE_SUMMARY": practice.handleNewSession(); break;
      case "INTERVIEW_QUESTION": app.setScreen("INTERVIEW_HOME"); break;
      case "INTERVIEW_THINK":
      case "INTERVIEW_SPEAK":
      case "INTERVIEW_PLAYBACK":
        iv.handleInterviewCancel(); break;
      case "INTERVIEW_REFLECT": app.setScreen("INTERVIEW_PLAYBACK"); break;
      case "INTERVIEW_SCORE": app.setScreen("INTERVIEW_HOME"); break;
    }
  }, [app, practice, iv]);

  const showBackButton =
    app.screen !== "HOME" &&
    app.screen !== "INTERVIEW_HOME" &&
    app.screen !== "HISTORY" &&
    app.screen !== "FEATURE_REQUEST";

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

      {app.showNavbar && (
        <TopNavbar
          activeSection={app.section}
          onNavigate={handleNavNavigate}
          isAuthenticated={app.isAuthenticated}
          isAuthLoading={app.isAuthLoading}
          isLocalhost={app.isLocalhostEnv}
          user={app.user}
          isAccountMenuOpen={app.isAccountMenuOpen}
          onToggleAccountMenu={() => app.setIsAccountMenuOpen((prev) => !prev)}
          onLogin={() => app.login()}
          onDevLogin={() => { void app.devLogin(); }}
          onLogout={() => { void handleLogout(); }}
          accountMenuRef={app.accountMenuRef}
        />
      )}

      {showBackButton && (
        <button
          type="button"
          onClick={handleBack}
          className="absolute left-4 top-14 z-50 p-2 text-[#1a1a1a]/50 transition-colors hover:text-[#1a1a1a]/80 sm:left-6 md:left-8"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <AnimatePresence>
        <UtilityScreens />
        <GeneralFlow />
        <InterviewFlow />
      </AnimatePresence>
    </div>
  );
}

export default App;
