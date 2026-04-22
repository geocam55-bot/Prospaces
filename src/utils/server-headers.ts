/**
 * Shared helper for building headers when calling the Supabase Edge Function server.
 *
 * The Supabase gateway requires `Authorization: Bearer <publicAnonKey>` to invoke
 * edge functions.  The user's session JWT is passed in a separate `X-User-Token`
 * header so the server handler can authenticate the caller.
 *
 * We gate all header-building behind an "auth ready" promise so that callers never
 * fire requests before the Supabase auth layer has finished hydrating the session
 * from localStorage on page load.
 */

import { createClient } from './supabase/client';
import { publicAnonKey } from './supabase/info';

const supabase = createClient();

// ── Auth-ready gate ────────────────────────────────────────────────────
// Resolves once the Supabase auth layer has delivered its first session
// (the INITIAL_SESSION event).  Any code that calls `getServerHeaders()`
// before this fires will wait instead of sending a tokenless request.
let _authReady: (v?: unknown) => void;
const _authReadyPromise = new Promise((resolve) => {
  _authReady = resolve;
});

// ── Proactive token cache via auth state listener ──────────────────────
let _cachedToken: string | null = null;
let _tokenRequestInFlight: Promise<string | null> | null = null;
let _lastRefreshAttemptMs = 0;
const REFRESH_COOLDOWN_MS = 30_000;

// Keep the cache fresh whenever auth state changes (login, logout, refresh).
// The very first event Supabase fires is INITIAL_SESSION — resolve the gate.
const { data: { subscription: _authSub } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    _cachedToken = session?.access_token ?? null;
    // Resolve the gate on any first event (INITIAL_SESSION, SIGNED_IN, etc.)
    _authReady();
  },
);

// Safety net: if onAuthStateChange never fires (edge case), unblock after 2s
setTimeout(() => _authReady(), 2000);

/**
 * Get the current user's access token (session JWT).
 * Always queries the Supabase client for the latest session to avoid stale
 * cached tokens that cause "Auth session missing!" 401 errors.
 * Returns null if no session is available.
 */
export async function getUserAccessToken(): Promise<string | null> {
  if (_tokenRequestInFlight) {
    return _tokenRequestInFlight;
  }

  _tokenRequestInFlight = (async () => {
  // Wait for the auth layer to have delivered at least one session event
  await _authReadyPromise;

  // Always get the latest session from the Supabase client.
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If there's a session error, try refreshing immediately
    if (sessionError) {
      const now = Date.now();
      if (now - _lastRefreshAttemptMs >= REFRESH_COOLDOWN_MS) {
        _lastRefreshAttemptMs = now;
        try {
          const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshed?.access_token) {
            _cachedToken = refreshed.access_token;
            return refreshed.access_token;
          }
        } catch (refreshErr) {
          // Ignored
        }
      }
      // Fall through to check cached token
    }
    
    if (session?.access_token) {
      // Check if the token is expired or about to expire (within 5 minutes).
      // getSession() returns the cached session without auto-refreshing in v2,
      // so we must explicitly refresh stale tokens to prevent server-side 401s.
      const isExpiredOrStale = session.expires_at
        && session.expires_at * 1000 <= Date.now() + 5 * 60_000;

      if (isExpiredOrStale) {
        const now = Date.now();
        if (now - _lastRefreshAttemptMs >= REFRESH_COOLDOWN_MS) {
          _lastRefreshAttemptMs = now;
          try {
            const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshed?.access_token) {
              _cachedToken = refreshed.access_token;
              return refreshed.access_token;
            }
          } catch (refreshErr) {
            // Refresh failed — fall through; the old token might still work for a few seconds
          }
        }
      }

      _cachedToken = session.access_token;
      return session.access_token;
    }
  } catch (err) {
    // getSession failed — fall through to cached token
  }

  // Fallback: return cached token if getSession() failed (e.g. network hiccup)
  if (_cachedToken) {
    return _cachedToken;
  }

  return null; // user truly isn't logged in
  })();

  try {
    return await _tokenRequestInFlight;
  } finally {
    _tokenRequestInFlight = null;
  }
}

/**
 * Build headers for a server API call.
 * Always includes Authorization with the anon key (for the gateway).
 * Adds X-User-Token when a session is available.
 */
export async function getServerHeaders(extraHeaders?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const userToken = await getUserAccessToken();
  if (!headers['X-User-Token'] && userToken) {
    headers['X-User-Token'] = userToken;
  }

  return headers;
}