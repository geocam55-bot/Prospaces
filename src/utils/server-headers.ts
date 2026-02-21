/**
 * Shared helper for building headers when calling the Supabase Edge Function server.
 *
 * The Supabase gateway requires `Authorization: Bearer <publicAnonKey>` to invoke
 * edge functions.  The user's session JWT is passed in a separate `X-User-Token`
 * header so the server handler can authenticate the caller.
 *
 * We subscribe to `onAuthStateChange` so the token is always ready — this avoids
 * the race condition where `getSession()` returns null before the auth layer has
 * finished hydrating from localStorage on page load.
 */

import { createClient } from './supabase/client';
import { publicAnonKey } from './supabase/info';

const supabase = createClient();

// ── Proactive token cache via auth state listener ──────────────────────
let _cachedToken: string | null = null;

// Fire-and-forget: prime the cache as soon as possible
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.access_token) _cachedToken = session.access_token;
});

// Keep the cache fresh whenever auth state changes (login, logout, refresh)
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedToken = session?.access_token ?? null;
});

/**
 * Get the current user's access token (session JWT).
 * Returns null if no session is available.
 */
export async function getUserAccessToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      // Check if token is about to expire (within 60s) and refresh proactively
      if (session.expires_at && session.expires_at * 1000 <= Date.now() + 60_000) {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        if (refreshed?.access_token) {
          _cachedToken = refreshed.access_token;
          return refreshed.access_token;
        }
      }
      _cachedToken = session.access_token;
      return session.access_token;
    }
  } catch {
    // getSession failed — fall through to cached token
  }

  // Fallback: return the token captured by onAuthStateChange / initial prime
  if (_cachedToken) return _cachedToken;

  // Last resort: wait briefly for the auth layer to finish hydrating, then retry
  await new Promise((r) => setTimeout(r, 150));
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      _cachedToken = session.access_token;
      return session.access_token;
    }
  } catch {
    // still nothing
  }

  return _cachedToken; // may still be null if user truly isn't logged in
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
