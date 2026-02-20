import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { azureOAuthInit } from './azure-oauth-init.ts';
import { azureOAuthCallback } from './azure-oauth-callback.ts';
import { googleRoutes } from './google-oauth.ts';
import { microsoftRoutes } from './microsoft-oauth.ts';
import { emailRoutes } from './email-handler.ts';
import { calendarRoutes } from './calendar-handler.ts';
import { dataMigration } from './data-migration.ts';
import { fixProfileMismatch } from './fix-profile-mismatch.ts';
import { handleResetPassword } from './reset-password.ts';
import { backgroundJobs } from './background-jobs.ts';

const app = new Hono();

app.use('*', logger(console.log));
app.use('*', cors());

// Mount OAuth routes
app.route('/', googleRoutes);
app.route('/', microsoftRoutes);
app.route('/', emailRoutes);
app.route('/', calendarRoutes);

// Legacy Azure routes (keeping for backwards compatibility)
azureOAuthInit(app);
azureOAuthCallback(app);

// Other routes
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