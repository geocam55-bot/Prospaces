import { projectId, publicAnonKey } from './supabase/info';
import { getServerHeaders } from './server-headers';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/portal`;

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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['X-Portal-Token'] = token;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.statusText}`);
  }

  return data;
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

export async function sendPortalMessage(subject: string, message: string) {
  return portalFetch('/messages', {
    method: 'POST',
    body: JSON.stringify({ subject, message }),
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

export async function createPortalInvite(contactId: string, accessToken: string) {
  const headers = await getServerHeaders();
  const response = await fetch(`${BASE_URL}/invite`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ contactId }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create invite');
  return data;
}

export async function getPortalUsers(accessToken: string) {
  const headers = await getServerHeaders();
  const response = await fetch(`${BASE_URL}/portal-users`, {
    headers,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to list portal users');
  return data;
}

export async function revokePortalAccess(contactId: string, accessToken: string) {
  const headers = await getServerHeaders();
  const response = await fetch(`${BASE_URL}/revoke/${contactId}`, {
    method: 'DELETE',
    headers,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to revoke access');
  return data;
}

export async function replyToPortalMessage(messageId: string, contactId: string, reply: string, accessToken: string) {
  const headers = await getServerHeaders();
  const response = await fetch(`${BASE_URL}/reply`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messageId, contactId, reply }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to send reply');
  return data;
}