import { publicAnonKey } from './supabase/info';
import { createClient } from './supabase/client';
import { buildServerFunctionUrl, getServerFunctionUrlCandidates } from './server-function-url';
import { getServerHeaders, getUserAccessToken } from './server-headers';

const BASE_URL = buildServerFunctionUrl('/portal');

async function crmHeaders(accessToken?: string): Promise<Record<string, string>> {
  const freshToken = await getUserAccessToken().catch(() => null);
  const userToken = freshToken || accessToken || null;

  return {
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json',
    ...(userToken ? { 'X-User-Token': userToken } : {}),
  };
}

function isUnmatchedResponse(response: Response, data: any): boolean {
  return response.status === 404 || data?.matched === false;
}

function isApplicationErrorResponse(response: Response, data: any): boolean {
  return !!response.ok
    && !!data
    && typeof data === 'object'
    && (typeof data.error === 'string' || typeof data.message === 'string')
    && data.success !== true;
}

function shouldRetryAuth(response: Response, data: any): boolean {
  const rawError = String(data?.error || data?.message || '');
  return (
    response.status === 401
    || /invalid.*token|envalid.*token|expired.*token|token.*expired|jwt|user token|missing auth token|unauthorized/i.test(rawError)
  );
}

function getPortalBaseUrlCandidates(): string[] {
  return Array.from(new Set([BASE_URL, ...getServerFunctionUrlCandidates('/portal')]));
}

async function fetchFromServer(
  path: string,
  options: RequestInit = {},
  getHeaders: () => Promise<Record<string, string>> | Record<string, string>,
  retryAuth?: () => Promise<boolean>,
): Promise<any> {
  let lastError: Error | null = null;

  for (const baseUrl of getPortalBaseUrlCandidates()) {
    let didRetryAuth = false;

    while (true) {
      const headers = await getHeaders();
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      const applicationError = isApplicationErrorResponse(response, data);

      if (response.ok && !isUnmatchedResponse(response, data) && !applicationError) {
        return data;
      }

      if (isUnmatchedResponse(response, data)) {
        lastError = new Error(`Messaging route unavailable at ${baseUrl}`);
        break;
      }

      if (!didRetryAuth && retryAuth && shouldRetryAuth(response, data)) {
        didRetryAuth = true;
        const refreshed = await retryAuth();
        if (refreshed) {
          continue;
        }
      }

      const rawError = String(data?.error || data?.message || `Request failed (${response.status}): ${response.statusText}`);
      lastError = new Error(
        shouldRetryAuth(response, data)
          ? 'Your sign-in session expired. Please refresh the page or sign in again, then retry.'
          : rawError
      );
      break;
    }
  }

  throw lastError || new Error('Unable to reach the messaging server');
}

// ── Session management ──
const PORTAL_TOKEN_KEY = 'portal_session_token';
const PORTAL_USER_KEY = 'portal_user';

export function getPortalToken(): string | null {
  return localStorage.getItem(PORTAL_TOKEN_KEY);
}

export function getPortalUser(): { email: string; name: string; contactId: string } | null {
  const raw = localStorage.getItem(PORTAL_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isPortalLoggedIn(): boolean {
  return !!getPortalToken() && !!getPortalUser();
}

function saveSession(token: string, user: { email: string; name: string; contactId: string }) {
  localStorage.setItem(PORTAL_TOKEN_KEY, token);
  localStorage.setItem(PORTAL_USER_KEY, JSON.stringify(user));
}

export function clearPortalSession() {
  localStorage.removeItem(PORTAL_TOKEN_KEY);
  localStorage.removeItem(PORTAL_USER_KEY);
}

// ── Shared fetch helper ──
async function portalFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getPortalToken();

  return fetchFromServer(path, options, () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['X-Portal-Token'] = token;
    }

    return headers;
  });
}

async function crmFetch(path: string, options: RequestInit = {}, accessToken?: string): Promise<any> {
  let tokenOverride = accessToken;

  return fetchFromServer(
    path,
    options,
    () => tokenOverride ? crmHeaders(tokenOverride) : getServerHeaders(),
    async () => {
      const supabase = createClient();
      const refreshResult = await supabase.auth.refreshSession().catch(() => ({ data: { session: null } }));
      tokenOverride = refreshResult?.data?.session?.access_token || undefined;
      return !!tokenOverride;
    },
  );
}

// ── Auth ──

export async function portalLogin(email: string, password: string) {
  const data = await portalFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (data.success && data.token) {
    saveSession(data.token, data.user);
  }

  return data;
}

export async function portalRegister(inviteCode: string, password: string) {
  const data = await portalFetch('/register', {
    method: 'POST',
    body: JSON.stringify({ inviteCode, password }),
  });

  if (data.success && data.token) {
    saveSession(data.token, data.user);
  }

  return data;
}

export async function portalLogout() {
  try {
    await portalFetch('/logout', { method: 'POST' });
  } catch {
    // Ignore errors on logout
  }
  clearPortalSession();
}

// ── Data ──

export async function getPortalDashboard() {
  return portalFetch('/dashboard');
}

export async function getPortalQuotes() {
  return portalFetch('/quotes');
}

export async function getPortalProjects() {
  return portalFetch('/projects');
}

export async function getPortalDocuments() {
  return portalFetch('/documents');
}

export async function getPortalMessages() {
  return portalFetch('/messages');
}

export async function sendPortalMessage(subject: string, message: string, messageId?: string, context?: { contextType?: string; contextLabel?: string }) {
  return portalFetch('/messages', {
    method: 'POST',
    body: JSON.stringify({
      subject,
      message,
      body: message,
      messageId,
      contextType: context?.contextType,
      contextLabel: context?.contextLabel,
    }),
  });
}

export async function markMessageRead(messageId: string) {
  return portalFetch(`/messages/${messageId}/read`, { method: 'POST' });
}

export async function updatePortalProfile(updates: { phone?: string; address?: string; company?: string }) {
  return portalFetch('/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function acceptQuote(quoteId: string) {
  return portalFetch(`/quotes/${quoteId}/accept`, { method: 'POST' });
}

export async function rejectQuote(quoteId: string) {
  return portalFetch(`/quotes/${quoteId}/reject`, { method: 'POST' });
}

// ── CRM-side functions (use CRM auth) ──

export async function getCrmPortalMessages(accessToken?: string) {
  return crmFetch('/crm-messages', {}, accessToken);
}

export async function createPortalInvite(contactId: string, accessToken?: string) {
  return crmFetch('/invite', {
    method: 'POST',
    body: JSON.stringify({ contactId }),
  }, accessToken);
}

export async function getPortalUsers(accessToken?: string) {
  return crmFetch('/portal-users', {}, accessToken);
}

export async function revokePortalAccess(contactId: string, accessToken?: string) {
  return crmFetch(`/revoke/${contactId}`, {
    method: 'DELETE',
  }, accessToken);
}

export async function createCrmPortalMessage(contactId: string, message: string, subject: string, accessToken?: string) {
  return crmFetch('/crm-message', {
    method: 'POST',
    body: JSON.stringify({ contactId, message, subject }),
  }, accessToken);
}

export async function replyToPortalMessage(messageId: string, contactId: string, reply: string, accessToken?: string) {
  return crmFetch('/reply', {
    method: 'POST',
    body: JSON.stringify({ messageId, contactId, reply, body: reply }),
  }, accessToken);
}

export async function addPortalInternalNote(messageId: string, contactId: string, note: string, accessToken?: string) {
  return crmFetch('/internal-note', {
    method: 'POST',
    body: JSON.stringify({ messageId, contactId, note }),
  }, accessToken);
}

export async function updatePortalThreadStatus(messageId: string, contactId: string, status: 'open' | 'resolved', accessToken?: string) {
  return crmFetch('/status', {
    method: 'POST',
    body: JSON.stringify({ messageId, contactId, status }),
  }, accessToken);
}

export async function getInternalChats(accessToken?: string) {
  return crmFetch('/internal-chats', {}, accessToken);
}

export async function createInternalChat(payload: {
  title: string;
  contextType?: string;
  contextLabel?: string;
  initialMessage?: string;
  chatType?: 'general' | 'direct' | 'group';
  participants?: Array<{ id?: string; name: string; email?: string; kind?: 'staff' | 'portal' }>;
}, accessToken?: string) {
  return crmFetch('/internal-chats', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, accessToken);
}

export async function sendInternalChatMessage(chatId: string, message: string, accessToken?: string) {
  return crmFetch(`/internal-chats/${chatId}/message`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  }, accessToken);
}