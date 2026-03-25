import { useState, useEffect, useCallback } from "react";
import {
  apiClient,
  initializeAuth,
  logout as apiLogout,
  clearAccessToken,
  getAccessToken,
  API_BASE_URL,
} from "@/lib/apiClient";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

const isLocalhost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  isLocalhost: boolean;
  login: (redirectPath?: string) => void;
  devLogin: (email?: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Access token for debugging (remove in production) */
  _accessToken: string | null;
}

/**
 * Hook for managing authentication with the backend OAuth flow.
 * Uses HttpOnly cookies for refresh tokens and memory-stored access tokens.
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize auth on app mount
   * Calls refresh first to get access token, then /api/auth/me
   */
  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await initializeAuth();

    if (result.success && result.user) {
      setUser(result.user as User);
    } else {
      setUser(null);
      if (result.error) {
        setError(result.error);
      }
    }

    setIsLoading(false);
  }, []);

  /**
   * Refresh user data by re-initializing auth.
   * All token refresh logic is centralized in apiClient.ts to avoid race conditions.
   */
  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await initializeAuth();

    if (result.success && result.user) {
      setUser(result.user as User);
    } else {
      setUser(null);
      if (result.error) {
        setError(result.error);
      }
    }

    setIsLoading(false);
  }, []);

  /**
   * Redirect to Google OAuth login
   */
  const login = useCallback((redirectPath: string = "/") => {
    // Store redirect path for after login
    sessionStorage.setItem("auth_redirect", redirectPath);
    
    // Clear any stale tokens
    clearAccessToken();
    
    // Redirect to backend OAuth login endpoint
    window.location.href = `${API_BASE_URL}/api/auth/google/login`;
  }, []);

  /**
   * Dev-only login via POST /api/auth/dev/login
   * Skips OAuth, creates/finds a dev user on the backend
   */
  const devLogin = useCallback(async (
    email?: string,
    firstName?: string,
    lastName?: string,
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const body: Record<string, string> = {};
      if (email) body.email = email;
      if (firstName) body.firstName = firstName;
      if (lastName) body.lastName = lastName;

      // Use raw fetch — apiClient would try token refresh and fail
      const response = await fetch(`${API_BASE_URL}/api/auth/dev/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Dev login failed (${response.status})`);
      }

      // After dev login, the backend sets refresh cookie + may return access token.
      // Re-initialize auth to pick up the new session.
      const result = await initializeAuth();
      if (result.success && result.user) {
        setUser(result.user as User);
      } else {
        throw new Error("Dev login succeeded but failed to initialize session");
      }
    } catch (err) {
      console.error("Dev login error:", err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout - clears local token and calls backend
   */
  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setError(null);
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    isLocalhost,
    login,
    devLogin,
    logout,
    refreshUser,
    _accessToken: getAccessToken(), // For debugging
  };
}

/**
 * @deprecated Use apiClient from @/lib/apiClient instead
 * Kept for backward compatibility
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return apiClient(url, options);
}
