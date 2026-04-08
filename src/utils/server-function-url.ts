import { getSupabaseUrl } from './supabase/client';

const DEFAULT_FUNCTION_ROUTE = 'make-server-8405be07';
const FALLBACK_FUNCTION_ROUTES = [
  DEFAULT_FUNCTION_ROUTE,
  `server/${DEFAULT_FUNCTION_ROUTE}`,
  'server',
];

function normalizePath(path = ''): string {
  return path
    ? (path.startsWith('/') ? path : `/${path}`)
    : '';
}

function getConfiguredFunctionRoute(): string | null {
  try {
    // @ts-ignore
    const envRoute = process.env.SERVER_FUNCTION_ROUTE || process.env.SUPABASE_SERVER_FUNCTION;
    if (typeof envRoute === 'string' && envRoute.trim()) {
      return envRoute.trim();
    }
  } catch {
    // Ignore browser/runtime env lookup issues.
  }

  try {
    const storedRoute = localStorage.getItem('preferred_server_function_route');
    if (storedRoute?.trim()) {
      return storedRoute.trim();
    }
  } catch {
    // localStorage may be unavailable during tests/SSR.
  }

  return null;
}

export function getServerFunctionUrlCandidates(path = ''): string[] {
  const normalizedPath = normalizePath(path);
  const configuredRoute = getConfiguredFunctionRoute();

  return Array.from(
    new Set([configuredRoute, ...FALLBACK_FUNCTION_ROUTES].filter((route): route is string => !!route))
  ).map((route) => `${getSupabaseUrl()}/functions/v1/${route}${normalizedPath}`);
}

export function buildServerFunctionUrl(path = ''): string {
  return getServerFunctionUrlCandidates(path)[0];
}