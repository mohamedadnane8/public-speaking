/**
 * Centralized API Client for cross-site authentication
 * 
 * IMPORTANT: For cross-site cookies to work (localhost:3000 -> api.publicspeaking.adnanelogs.com),
 * the backend MUST set cookies with:
 *   SameSite=None; Secure
 * 
 * If you see 401s despite this frontend code being correct,
 * check your backend cookie settings and CORS configuration.
 */

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.publicspeaking.adnanelogs.com";
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");
const DEBUG = import.meta.env.DEV;

// Token storage (in-memory for security)
let accessToken: string | null = null;
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

/**
 * Logger helper for auth debugging
 */
function logAuth(level: "info" | "warn" | "error", message: string, data?: unknown): void {
  if (!DEBUG) return;
  
  const prefix = "[Auth]";
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const fullMessage = `${timestamp} ${prefix} ${message}`;
  
  switch (level) {
    case "info":
      console.log(`%c${fullMessage}`, "color: #2563eb", data ? "" : "", data || "");
      break;
    case "warn":
      console.warn(`%c${fullMessage}`, "color: #d97706", data ? "" : "", data || "");
      break;
    case "error":
      console.error(`%c${fullMessage}`, "color: #dc2626", data ? "" : "", data || "");
      break;
  }
}

/**
 * Set the access token (called after successful refresh or login)
 */
export function setAccessToken(token: string | null): void {
  const previousToken = accessToken ? `${accessToken.substring(0, 20)}...` : null;
  const newToken = token ? `${token.substring(0, 20)}...` : null;
  
  accessToken = token;
  
  if (token) {
    logAuth("info", "🔑 Access token set", {
      previous: previousToken,
      new: newToken,
      length: token.length,
    });
  } else {
    logAuth("warn", "🗑️ Access token cleared", { previous: previousToken });
  }
}

/**
 * Get current access token
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Clear access token (called on logout)
 */
export function clearAccessToken(): void {
  const previousToken = accessToken ? `${accessToken.substring(0, 20)}...` : null;
  accessToken = null;
  logAuth("warn", "🗑️ Access token cleared (logout)", { previous: previousToken });
}

/**
 * Process the refresh queue after a refresh attempt
 */
function processQueue(_error: Error | null, token: string | null = null): void {
  refreshQueue.forEach((callback) => {
    callback(token);
  });
  refreshQueue = [];
}

/**
 * Refresh the access token using the refresh cookie
 * Prevents multiple simultaneous refresh calls
 */
async function performRefresh(): Promise<string | null> {
  // If already refreshing, queue this request
  if (isRefreshing) {
    logAuth("info", "⏳ Refresh already in progress, joining queue");
    return new Promise((resolve) => {
      refreshQueue.push((token) => {
        resolve(token);
      });
    });
  }

  isRefreshing = true;
  logAuth("info", "🔄 Starting token refresh...", { 
    url: `${API_BASE_URL}/api/auth/refresh`,
    hasExistingToken: !!accessToken,
  });

  try {
    let response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include", // CRITICAL: Sends the refresh cookie
      headers: {
        "Accept": "application/json",
      },
    });

    logAuth("info", "📥 Refresh response received", {
      status: response.status,
      statusText: response.statusText,
      // Note: We can't read Set-Cookie headers from JS due to HttpOnly
      // But we can check if the response was ok
    });

    if (!response.ok && response.status === 409) {
      logAuth("warn", "♻️ Refresh token already rotated (parallel request). Retrying once...");
      await new Promise((resolve) => setTimeout(resolve, 200));
      response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Accept": "application/json",
        },
      });
    }

    if (!response.ok) {
      // Check if cookie was missing
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.code === "NO_REFRESH_COOKIE" || !errorData.code) {
          logAuth("error", "🍪 Refresh cookie missing!", {
            error: errorData,
            hint: "Check DevTools > Application > Cookies",
            backendRequirements: [
              "SameSite=None",
              "Secure", 
              "HttpOnly (optional but recommended)",
            ],
          });
          
          console.warn(
            "\n%c[Auth Configuration Warning]%c\n" +
            "Cross-site authentication is not working correctly.\n\n" +
            "Backend cookie requirements:\n" +
            "  • SameSite=None (required for cross-site)\n" +
            "  • Secure (required for SameSite=None)\n" +
            "  • CORS: Access-Control-Allow-Origin: http://localhost:3000\n" +
            "  • CORS: Access-Control-Allow-Credentials: true\n\n" +
            "Check DevTools > Application > Cookies to verify\n" +
            "the refresh token cookie is being set.\n",
            "color: orange; font-weight: bold",
            "color: inherit"
          );
        }
      }
      throw new Error(`Refresh failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.accessToken) {
      logAuth("error", "❌ No access token in refresh response", { data });
      throw new Error("No access token in refresh response");
    }

    logAuth("info", "✅ Token refresh successful", {
      tokenPreview: `${data.accessToken.substring(0, 20)}...`,
      tokenLength: data.accessToken.length,
    });

    setAccessToken(data.accessToken);
    processQueue(null, data.accessToken);
    return data.accessToken;
  } catch (error) {
    logAuth("error", "❌ Token refresh failed", error);
    clearAccessToken();
    processQueue(error as Error, null);
    return null;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Main API client function with automatic token refresh
 * 
 * @param endpoint - API endpoint (e.g., "/api/auth/me")
 * @param options - Fetch options
 * @param retryCount - Internal retry counter (prevents infinite loops)
 * @returns Response object
 */
export async function apiClient(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<Response> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const isRetry = retryCount > 0;
  
  // Build headers with authorization if token exists
  const headers: Record<string, string> = {
    "Accept": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  // Add Content-Type for JSON bodies
  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    try {
      JSON.parse(options.body);
      headers["Content-Type"] = "application/json";
    } catch {
      // Not JSON, don't set Content-Type
    }
  }

  // Attach Bearer token if available
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
    logAuth("info", `🔒 Request with Bearer token`, {
      endpoint,
      method: options.method || "GET",
      tokenPreview: `${accessToken.substring(0, 20)}...`,
      isRetry,
    });
  } else {
    logAuth("warn", `🔓 Request without Bearer token`, {
      endpoint,
      method: options.method || "GET",
      isRetry,
    });
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // CRITICAL: For cross-site cookies
  });

  logAuth("info", `📨 Response received`, {
    endpoint,
    status: response.status,
    statusText: response.statusText,
    isRetry,
  });

  // Handle 401 - attempt token refresh (but only once per request)
  if (response.status === 401 && retryCount === 0) {
    logAuth("warn", `⚠️ 401 Unauthorized, attempting token refresh`, { endpoint });
    
    const newToken = await performRefresh();
    
    if (newToken) {
      logAuth("info", `🔄 Retrying request with new token`, { endpoint });
      // Retry the original request with new token
      return apiClient(endpoint, options, retryCount + 1);
    }
    
    // Refresh failed - token will remain null
    logAuth("error", `❌ Refresh failed, user needs to re-authenticate`);
  }

  return response;
}

/**
 * Specialized function for auth-only endpoints that don't need Bearer token
 * but do need the refresh cookie
 */
export async function authRefreshOnly(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  return fetch(url, {
    ...options,
    headers: {
      "Accept": "application/json",
      ...(options.headers as Record<string, string> || {}),
    },
    credentials: "include", // CRITICAL: Sends the refresh cookie
  });
}

/**
 * Check if authentication is working by calling refresh + me
 * Use this on app startup and after OAuth callback
 */
export async function initializeAuth(): Promise<{ 
  success: boolean; 
  user?: unknown; 
  error?: string 
}> {
  logAuth("info", "🚀 Initializing auth...", { 
    apiUrl: API_BASE_URL,
    currentToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
  });

  try {
    // Step 1: Try to refresh to get access token
    logAuth("info", "📤 Calling /api/auth/refresh...");

    const token = await performRefresh();
    if (!token) {
      return {
        success: false,
        error: "Session expired"
      };
    }

    logAuth("info", "✅ Got access token from refresh", {
      tokenPreview: `${token.substring(0, 20)}...`,
      tokenLength: token.length,
    });

    // Step 2: Get user info with the new access token
    logAuth("info", "📤 Calling /api/auth/me with new token...");
    
    const meResponse = await apiClient("/api/auth/me", {
      method: "GET",
    });

    if (!meResponse.ok) {
      logAuth("error", "❌ Failed to get user info", { status: meResponse.status });
      return { 
        success: false, 
        error: "Failed to get user info" 
      };
    }

    const user = await meResponse.json();
    logAuth("info", "✅ Auth initialized successfully", { 
      userId: (user as { id?: string }).id,
      email: (user as { email?: string }).email,
    });
    
    return { success: true, user };
  } catch (error) {
    logAuth("error", "❌ Auth initialization failed", error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
}

/**
 * Logout user - clears token and calls backend
 */
export async function logout(): Promise<void> {
  logAuth("info", "🚪 Logging out...");
  try {
    const response = await apiClient("/api/auth/logout", {
      method: "POST",
    });
    logAuth("info", "Logout response", { status: response.status });
  } catch (error) {
    logAuth("error", "Logout API call failed", error);
  } finally {
    clearAccessToken();
    logAuth("info", "🚪 Logout complete");
  }
}

// Debug helper (remove in production)
if (import.meta.env.DEV) {
  (window as unknown as { __authDebug: unknown }).__authDebug = {
    getAccessToken,
    setAccessToken,
    clearAccessToken,
    getAllCookies: () => document.cookie,
    checkCookies: () => {
      const cookies = document.cookie.split(";").map(c => c.trim());
      console.log("[Auth Debug] Cookies found:", cookies.length);
      cookies.forEach(c => {
        const [name] = c.split("=");
        // Check for common auth cookie names
        const isAuthCookie = /refresh|token|auth|session/i.test(name);
        console.log(
          `  ${isAuthCookie ? "🔐" : "🍪"} ${name}: ${isAuthCookie ? "(auth cookie)" : ""}`
        );
      });
      return cookies;
    },
  };
  
  logAuth("info", "🔧 Auth debug helper available at window.__authDebug");
}
