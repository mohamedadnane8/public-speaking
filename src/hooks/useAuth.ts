import { useState, useEffect, useCallback } from "react";
import { 
  apiClient, 
  initializeAuth, 
  logout as apiLogout,
  clearAccessToken,
  getAccessToken,
} from "@/lib/apiClient";

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.publicspeaking.adnanelogs.com";
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (redirectPath?: string) => void;
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
   * Refresh user data using current access token
   * Used after auth success page
   */
  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // If we don't have an access token, try to refresh first
      if (!getAccessToken()) {
        const initResult = await initializeAuth();
        if (initResult.success) {
          setUser(initResult.user as User);
        } else {
          setUser(null);
        }
        return;
      }

      // We have a token, call /api/auth/me
      const response = await apiClient("/api/auth/me", {
        method: "GET",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else if (response.status === 401) {
        // Token invalid, try full re-initialization
        const initResult = await initializeAuth();
        if (initResult.success) {
          setUser(initResult.user as User);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
      setError("Failed to check authentication status");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
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
    login,
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
