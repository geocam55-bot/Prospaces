const DEFAULT_APP_URL = 'https://app.prospacescrm.ca';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function isLocalhostUrl(url: string): boolean {
  return /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(url);
}

export function getAuthRedirectUrl(path = '/'): string {
  const configuredAppUrl = (import.meta.env.VITE_APP_URL || '').trim();
  const configuredBase = configuredAppUrl && /^https?:\/\//i.test(configuredAppUrl)
    ? normalizeBaseUrl(configuredAppUrl)
    : '';

  const originBase = typeof window !== 'undefined'
    ? normalizeBaseUrl(window.location.origin)
    : '';

  const base = originBase && !isLocalhostUrl(originBase)
    ? originBase
    : (configuredBase || DEFAULT_APP_URL);

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
