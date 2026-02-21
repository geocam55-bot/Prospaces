import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';

// ── Static imports ensure the Deno bundler includes every module file ──────
// Even if a module has an issue at registration time, the try-catch below
// prevents it from crashing the server or stopping other modules.
import { azureOAuthInit } from './azure-oauth-init.ts';
import { azureOAuthCallback } from './azure-oauth-callback.ts';
import { googleOAuth } from './google-oauth.ts';
import { dataMigration } from './data-migration.ts';
import { fixProfileMismatch } from './fix-profile-mismatch.ts';
import { handleResetPassword } from './reset-password.ts';
import { backgroundJobs } from './background-jobs.ts';
import { inventoryDiagnostic } from './inventory-diagnostic.ts';
import { marketing } from './marketing.ts';
import { handleCreateUser } from './create-user.ts';
import { fixContactOwnership } from './fix-contact-ownership.ts';
import { contactsAPI } from './contacts-api.ts';
import { profilesAPI } from './profiles-api.ts';
import { quotesAPI } from './quotes-api.ts';
import { settingsAPI } from './settings-api.ts';
import { permissionsAPI } from './permissions-api.ts';
import { customerPortalAPI } from './customer-portal-api.ts';

console.log('[index] All static imports resolved successfully');

// ── Build the Hono router ──────────────────────────────────────────────────
const api = new Hono();

// Track registration results for diagnostics
const loadedModules: string[] = [];
const failedModules: Array<{ name: string; error: string }> = [];

// Register each module inside a try-catch so one bad module can't block others
const registrations: Array<[string, () => void]> = [
  ['azureOAuthInit', () => azureOAuthInit(api)],
  ['azureOAuthCallback', () => azureOAuthCallback(api)],
  ['googleOAuth', () => googleOAuth(api)],
  ['dataMigration', () => dataMigration(api)],
  ['fixProfileMismatch', () => fixProfileMismatch(api)],
  ['backgroundJobs', () => backgroundJobs(api)],
  ['inventoryDiagnostic', () => inventoryDiagnostic(api)],
  ['marketing', () => marketing(api)],
  ['fixContactOwnership', () => fixContactOwnership(api)],
  ['contactsAPI', () => contactsAPI(api)],
  ['profilesAPI', () => profilesAPI(api)],
  ['quotesAPI', () => quotesAPI(api)],
  ['settingsAPI', () => settingsAPI(api)],
  ['permissionsAPI', () => permissionsAPI(api)],
  ['customerPortalAPI', () => customerPortalAPI(api)],
];

for (const [name, register] of registrations) {
  try {
    register();
    loadedModules.push(name);
    console.log(`[index] OK ${name}`);
  } catch (err: any) {
    failedModules.push({ name, error: err?.message || String(err) });
    console.error(`[index] FAIL ${name}: ${err?.message || err}`);
  }
}

// Standalone handlers
try {
  api.post('/make-server-8405be07/reset-password', handleResetPassword);
  loadedModules.push('resetPassword');
} catch (e: any) {
  failedModules.push({ name: 'resetPassword', error: e?.message || String(e) });
}

try {
  api.post('/make-server-8405be07/create-user', handleCreateUser);
  loadedModules.push('createUser');
} catch (e: any) {
  failedModules.push({ name: 'createUser', error: e?.message || String(e) });
}

// ── Health / diagnostics (always available) ────────────────────────────────
api.get('/make-server-8405be07/health', (c) => {
  return c.json({
    status: 'ok',
    version: '2025-02-21-v3',
    timestamp: new Date().toISOString(),
    loadedModules,
    failedModules,
    totalLoaded: loadedModules.length,
    totalFailed: failedModules.length,
  });
});

api.get('/make-server-8405be07/debug/routes', (c) => {
  return c.json({ loadedModules, failedModules });
});

// ── Catch-all 404 with diagnostics ─────────────────────────────────────────
api.all('*', (c) => {
  const method = c.req.method;
  const path = c.req.path;
  console.log(`[index] 404: ${method} ${path} | loaded=${loadedModules.length} failed=${failedModules.length}`);
  if (failedModules.length > 0) {
    console.log(`[index] Failed modules: ${JSON.stringify(failedModules)}`);
  }
  return c.json({
    error: 'Route not found',
    method,
    path,
    loadedModules: loadedModules.length,
    failedModules: failedModules.map(m => m.name),
    hint: 'GET /make-server-8405be07/health for full diagnostic',
  }, 404);
});

// ── Main app with middleware ────────────────────────────────────────────────
const app = new Hono();

app.use('*', logger(console.log));
app.use('*', cors());

// Mount api under /server (Supabase CLI deployment: function named "server" → paths arrive as /server/...)
app.route('/server', api);
// Mount api at / (Figma Make preview: paths arrive without /server prefix)
app.route('/', api);

console.log(`[index] Server starting. ${loadedModules.length} modules loaded, ${failedModules.length} failed.`);

Deno.serve(app.fetch);
