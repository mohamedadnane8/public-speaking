import { motion } from "framer-motion";
import { useAppContext } from "../contexts/AppContext";
import { useSessionContext } from "../contexts/SessionContext";
import { HistoryScreen } from "../screens/HistoryScreen";
import { FeatureRequestScreen } from "../screens/FeatureRequestScreen";
import { AuthSuccessScreen } from "../screens/AuthSuccessScreen";
import { AuthErrorScreen } from "../screens/AuthErrorScreen";
import type { Session, SessionLanguage, SessionDifficulty } from "../types/session";

const DEFAULT_LANGUAGE: SessionLanguage = "EN";
const DEFAULT_DIFFICULTY: SessionDifficulty = "MEDIUM";

export function UtilityScreens() {
  const app = useAppContext();
  const sess = useSessionContext();
  return (
    <>
      {/* History */}
      {app.screen === "HISTORY" && (
        app.isAuthenticated ? (
          <HistoryScreen
            sessions={sess.historySessions}
            isAuthenticated={app.isAuthenticated}
            onDeleteSession={sess.handleDeleteHistorySession}
          />
        ) : (
          <LoginPrompt
            title="History"
            description="Sign in to view your practice sessions, scores, and reflections."
            onLogin={() => app.login()}
          />
        )
      )}

      {/* Feature Request */}
      {app.screen === "FEATURE_REQUEST" && (
        app.isAuthenticated ? (
          <FeatureRequestScreen isAuthenticated={app.isAuthenticated} />
        ) : (
          <LoginPrompt
            title="Request Feature"
            description="Sign in to submit feature requests and view your previous submissions."
            onLogin={() => app.login()}
          />
        )
      )}

      {/* Auth Success */}
      {app.isAuthSuccessPage && (
        <AuthSuccessScreen
          onContinue={(authedUser) => {
            app.clearAuthParams();
            const pendingSession = sessionStorage.getItem("pending_session");
            if (authedUser && pendingSession) {
              let restored = false;
              try {
                const parsedSession = JSON.parse(pendingSession) as Session;
                if (parsedSession?.id && parsedSession?.overallScore !== undefined) {
                  sess.restoreSession({
                    ...parsedSession,
                    language: parsedSession.language ?? DEFAULT_LANGUAGE,
                    difficulty: parsedSession.difficulty ?? DEFAULT_DIFFICULTY,
                  });
                  sess.setSavedSessionId(null);
                  sess.setSaveAttemptedSessionId(null);
                  restored = true;
                }
              } catch (error) {
                console.error("Failed to restore pending session:", error);
                sessionStorage.removeItem("pending_session");
              }
              app.setScreen(restored ? "SCORE_SUMMARY" : "HOME");
            } else {
              app.setScreen("HOME");
            }
          }}
        />
      )}

      {/* Auth Error */}
      {app.isAuthErrorPage && (
        <AuthErrorScreen
          error={app.authError}
          onGoHome={() => {
            app.clearAuthParams();
            app.setScreen("HOME");
          }}
          onRetry={() => {
            app.clearAuthParams();
            app.login(window.location.pathname);
          }}
        />
      )}
    </>
  );
}

// ─── Shared login prompt ────────────────────────────────────────

function LoginPrompt({ title, description, onLogin }: { title: string; description: string; onLogin: () => void }) {
  return (
    <motion.div
      key={`${title}-login`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen w-full px-4 pt-16 flex flex-col items-center justify-center"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <h1
          className="text-4xl text-[#1a1a1a]"
          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}
        >
          {title}
        </h1>
        <p
          className="text-sm text-[#1a1a1a]/55 max-w-sm"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {description}
        </p>
        <button
          onClick={onLogin}
          className="px-8 py-3 border border-[#1a1a1a]/60 text-[#1a1a1a] text-xs tracking-[0.25em] uppercase transition-all duration-300 hover:border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#FDF6F0]"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          Login
        </button>
      </div>
    </motion.div>
  );
}
