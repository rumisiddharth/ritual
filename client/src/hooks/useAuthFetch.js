import { useCallback, useRef } from "react";

/**
 * useAuthFetch
 *
 * Returns a stable `authFetch` function that:
 * 1. Attaches the JWT Authorization header automatically
 * 2. Intercepts 401/403 responses and calls onUnauthorized (e.g. logout)
 *    so token expiry never silently fails across tabs/components
 *
 * The ref pattern keeps the function reference stable across renders,
 * avoiding spurious useEffect re-fires in CorrelationEngine, HabitDNA, etc.
 */
export function useAuthFetch(token, onUnauthorized) {
  // Store latest values in refs so the callback never goes stale
  const tokenRef = useRef(token);
  const onUnauthorizedRef = useRef(onUnauthorized);

  tokenRef.current = token;
  onUnauthorizedRef.current = onUnauthorized;

  const authFetch = useCallback(async (url, options = {}) => {
    const BASE = process.env.REACT_APP_API_URL || "";
    const response = await fetch(`${BASE}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenRef.current}`,
        ...(options.headers || {}),
      },
    });

    // FIX: Intercept expired/invalid token responses and trigger logout
    // Previously these would silently fail in individual components
    if (response.status === 401 || response.status === 403) {
      onUnauthorizedRef.current?.();
      return response; // return so callers can still inspect if needed
    }

    return response;
  }, []); // stable — no deps, uses refs internally

  return authFetch;
}
