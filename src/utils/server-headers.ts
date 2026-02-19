/**
 * Shared helper for building headers when calling the Supabase Edge Function server.
 *
 * The Supabase gateway requires `Authorization: Bearer <publicAnonKey>` to invoke
 * edge functions.  The user's session JWT is passed in a separate `X-User-Token`
 * header so the server handler can authenticate the caller.
 */

import { createClient } from './supabase/client';
import { publicAnonKey } from './supabase/info';

const supabase = createClient();

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
        if (refreshed?.access_token) return refreshed.access_token;
      }
      return session.access_token;
    }
  } catch {
    // Session retrieval failed — caller will handle null
  }
  return null;
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
  }

  return headers;
}
