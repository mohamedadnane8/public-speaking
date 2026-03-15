import { motion } from "framer-motion";

interface AuthErrorScreenProps {
  error?: string | null;
  onGoHome: () => void;
  onRetry: () => void;
}

export function AuthErrorScreen({ 
  error, 
  onGoHome, 
  onRetry 
}: AuthErrorScreenProps) {
  const getErrorMessage = (err: string | null | undefined): string => {
    if (!err) return "Something went wrong during sign in.";
    
    // Common OAuth error messages
    const errorMap: Record<string, string> = {
      "access_denied": "You declined to authorize the app.",
      "invalid_request": "Invalid authentication request.",
      "invalid_scope": "Invalid scope requested.",
      "server_error": "Authentication server error. Please try again later.",
      "temporarily_unavailable": "Authentication service is temporarily unavailable.",
      "state_mismatch": "Security validation failed. Please try again.",
      "no_code": "Authorization code missing. Please try again.",
      "token_exchange_failed": "Failed to complete authentication. Please try again.",
    };
    
    return errorMap[err] || err;
  };

  return (
    <motion.div
      key="auth-error"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full flex flex-col items-center justify-center px-4"
    >
      <div className="flex flex-col items-center space-y-8 w-full max-w-[min(100%,28rem)]">
        {/* Error icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "rgba(122, 46, 46, 0.08)" }}
        >
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
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
            Sign In Failed
          </h1>
          
          <p
            className="text-sm text-[#1a1a1a]/60 max-w-xs"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {getErrorMessage(error)}
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center gap-3"
        >
          <button
            onClick={onRetry}
            className="px-8 py-3 bg-[#1a1a1a] text-[#FDF6F0]/90 text-xs tracking-[0.25em] uppercase transition-all duration-300 hover:bg-[#1a1a1a]/90"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Try Again
          </button>
          
          <button
            onClick={onGoHome}
            className="text-[11px] tracking-[0.15em] uppercase text-[#1a1a1a]/40 hover:text-[#1a1a1a]/70 transition-colors"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Go Home
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
