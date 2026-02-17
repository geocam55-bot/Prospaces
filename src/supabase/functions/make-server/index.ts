import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { azureOAuthInit } from './azure-oauth-init.ts';
import { azureOAuthCallback } from './azure-oauth-callback.ts';
import { nylasOAuth } from './nylas-oauth.ts';
import { dataMigration } from './data-migration.ts';
import { fixProfileMismatch } from './fix-profile-mismatch.ts';
import { handleResetPassword } from './reset-password.ts';
import { backgroundJobs } from './background-jobs.ts';

const app = new Hono();

app.use('*', logger(console.log));
app.use('*', cors());

azureOAuthInit(app);
azureOAuthCallback(app);
nylasOAuth(app);
dataMigration(app);
fixProfileMismatch(app);
backgroundJobs(app);

// Health check endpoint
app.get('/health', (c) => {
  console.log('🏥 Health check endpoint hit');
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Password reset endpoint
app.post('/reset-password', handleResetPassword);

Deno.serve(app.fetch);
