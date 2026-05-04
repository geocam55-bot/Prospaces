import { projectId } from './supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

export async function requestPasswordResetEmail(email: string, redirectPath = '/'): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  const res = await fetch(`${BASE_URL}/auth/request-password-reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: normalizedEmail,
      redirectPath,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send reset email');
  }
}
