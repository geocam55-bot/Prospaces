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
  // Wait for the auth layer to have delivered at least one session event
  await _authReadyPromise;

  // Always get the latest session from the Supabase client.
  // The _cachedToken from onAuthStateChange can be stale if the client
  // internally refreshed the token between listener events.
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      // Proactively refresh if token is about to expire (within 60s)
      if (session.expires_at && session.expires_at * 1000 <= Date.now() + 60_000) {
        try {
          const { data: { session: refreshed } } = await supabase.auth.refreshSession();
          if (refreshed?.access_token) {
            _cachedToken = refreshed.access_token;
            return refreshed.access_token;
          }
        } catch {
          // Refresh failed — use current session token
        }
      }
      _cachedToken = session.access_token;
      return session.access_token;
    }
  } catch {
    // getSession failed — fall through to cached token
  }

  // Fallback: return cached token if getSession() failed (e.g. network hiccup)
  if (_cachedToken) {
    return _cachedToken;
  }

  return null; // user truly isn't logged in
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
  if (userToken) {
    headers['X-User-Token'] = userToken;
  } else {
    console.warn('[server-headers] No user token available — X-User-Token will be missing');
  }

  return headers;
}
