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

const app = new Hono();

app.use('*', logger(console.log));
app.use('*', cors());

azureOAuthInit(app);
azureOAuthCallback(app);
googleOAuth(app);
dataMigration(app);
fixProfileMismatch(app);
backgroundJobs(app);
inventoryDiagnostic(app);
marketing(app);

// Health check endpoint
app.get('/make-server-8405be07/health', (c) => {
  console.log('🏥 Health check endpoint hit');
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Password reset endpoint
app.post('/make-server-8405be07/reset-password', handleResetPassword);

// Catch-all for debugging 404s
app.all('*', (c) => {
  console.log('⚠️ 404 - Route not found:', c.req.method, c.req.path);
  return c.json({ error: 'Route not found', method: c.req.method, path: c.req.path }, 404);
});

Deno.serve(app.fetch);