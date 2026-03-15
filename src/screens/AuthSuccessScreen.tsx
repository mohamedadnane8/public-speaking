import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { initializeAuth } from "@/lib/apiClient";
import type { User } from "@/hooks/useAuth";

interface AuthSuccessScreenProps {
  onContinue: (user: User | null) => void;
}

export function AuthSuccessScreen({ onContinue }: AuthSuccessScreenProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedInit, setHasAttemptedInit] = useState(false);

  useEffect(() => {
    // Initialize auth: refresh token -> get access token -> get user
    async function init() {
      if (hasAttemptedInit) return;
      
      setIsLoading(true);
      setHasAttemptedInit(true);

      const result = await initializeAuth();

      if (result.success && result.user) {
        setUser(result.user as User);
      } else {
        setError(result.error || "Authentication failed");
      }

      setIsLoading(false);
    }

    init();
  }, [hasAttemptedInit]);

  // Auto-continue after successful auth
  useEffect(() => {
    if (user && !isLoading && !error) {
      const timer = setTimeout(() => {
        onContinue(user);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, error, onContinue]);

  return (
    <motion.div
      key="auth-success"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full flex flex-col items-center justify-center px-4"
    >
      <div className="flex flex-col items-center space-y-8 w-full max-w-[min(100%,28rem)]">
        {/* Status indicator */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: user 
              ? "rgba(46, 122, 78, 0.1)" 
              : error 
              ? "rgba(122, 46, 46, 0.08)"
              : "rgba(26, 26, 26, 0.05)",
          }}
        >
          {isLoading ? (
            // Loading spinner
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-[#1a1a1a]/20 border-t-[#1a1a1a]/60 rounded-full"
            />
          ) : user ? (
            // Success checkmark
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2E7A4E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            // Error X
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7A2E2E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <h1
            className="text-2xl tracking-[0.1em] text-[#1a1a1a]"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 400 }}
          >
            {isLoading
              ? "Signing you in..."
              : user
              ? `Welcome, ${user.firstName || "Back"}`
              : "Sign In Failed"}
          </h1>
          
          <p
            className="text-sm text-[#1a1a1a]/60 max-w-xs"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {isLoading
              ? "Please wait while we verify your session..."
              : user
              ? "You're signed in successfully."
              : error || "Could not complete sign in."}
          </p>

          {/* Cookie warning for cross-site issues */}
          {error && error.includes("cookie") && (
            <div
              className="mt-4 p-3 bg-[#7A2E2E]/5 border border-[#7A2E2E]/20 text-xs text-[#7A2E2E]/80 max-w-xs"
              style={{ fontFamily: '"Inter", sans-serif' }}
            >
              <strong>Cookie Issue Detected</strong>
              <br />
              Cross-site authentication requires backend cookies with:
              <code className="block mt-1 bg-[#7A2E2E]/10 px-2 py-1">
                SameSite=None; Secure
              </code>
            </div>
          )}
        </motion.div>

        {/* Action buttons */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-3"
          >
            {user ? (
              <button
                onClick={() => onContinue(user)}
                className="px-8 py-3 bg-[#1a1a1a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300 hover:bg-[#1a1a1a]/90"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                Continue
              </button>
            ) : (
              <>
                <button
                  onClick={() => window.location.reload()}
                  className="px-8 py-3 bg-[#1a1a1a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300 hover:bg-[#1a1a1a]/90"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  Try Again
                </button>
                <button
                  onClick={() => onContinue(null)}
                  className="text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a]/40 hover:text-[#1a1a1a]/70 transition-colors"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  Go Home
                </button>
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
