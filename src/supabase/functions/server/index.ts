import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
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

// All routes are registered on this sub-router with /make-server-8405be07/ prefix
const api = new Hono();

// Register route modules with error isolation — if one module fails to register,
// the others still work and we get a clear error log.
const modules: Array<[string, (app: Hono) => void]> = [
  ['azureOAuthInit', azureOAuthInit],
  ['azureOAuthCallback', azureOAuthCallback],
  ['googleOAuth', googleOAuth],
  ['dataMigration', dataMigration],
  ['fixProfileMismatch', fixProfileMismatch],
  ['backgroundJobs', backgroundJobs],
  ['inventoryDiagnostic', inventoryDiagnostic],
  ['marketing', marketing],
  ['fixContactOwnership', fixContactOwnership],
  ['contactsAPI', contactsAPI],
  ['profilesAPI', profilesAPI],
  ['quotesAPI', quotesAPI],
  ['settingsAPI', settingsAPI],
  ['permissionsAPI', permissionsAPI],
  ['customerPortalAPI', customerPortalAPI],
];

for (const [name, register] of modules) {
  try {
    register(api);
    console.log(`✅ Registered module: ${name}`);
  } catch (err) {
    console.error(`❌ Failed to register module ${name}:`, err);
  }
}

// Health check endpoint
api.get('/make-server-8405be07/health', (c) => {
  console.log('Health check endpoint hit');
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    registeredModules: modules.map(([name]) => name),
  });
});

// Password reset endpoint
api.post('/make-server-8405be07/reset-password', handleResetPassword);

// Create user endpoint (admin-only, creates Supabase Auth account + profile)
api.post('/make-server-8405be07/create-user', handleCreateUser);

// Catch-all for debugging 404s
api.all('*', (c) => {
  console.log('404 - Route not found:', c.req.method, c.req.path);
  return c.json({ error: 'Route not found', method: c.req.method, path: c.req.path }, 404);
});

// Main app with middleware
const app = new Hono();

app.use('*', logger(console.log));
app.use('*', cors());

// Mount api at /server (Codespace: function deployed as "server", paths arrive as /server/...)
app.route('/server', api);
// Mount api at / (Figma Make: paths arrive without /server prefix)
app.route('/', api);

Deno.serve(app.fetch);