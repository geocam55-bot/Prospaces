import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
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
import * as kv from './kv_store.tsx';

const app = new Hono();
const PREFIX = '/make-server-8405be07';

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
app.get('/', (c) => {
  return c.json({ status: 'ok', app: 'ProSpaces CRM', server: 'make-server', timestamp: new Date().toISOString() });
  });
  app.get('/health', (c) => {
    console.log('Health check endpoint hit');
      return c.json({ status: 'ok', timestamp: new Date().toISOString() });
      });

      // Password reset endpoint
      app.post('/reset-password', handleResetPassword);

      async function authenticateUser(c: any): Promise<{ user?: any; error?: string; status?: number }> {
        const authHeader = c.req.header('Authorization') || '';
          const tokenFromAuth = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
            const token = tokenFromAuth || c.req.header('X-User-Token');

              if (!token) {
                  return { error: 'Unauthorized', status: 401 };
                    }

                      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
                        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

                          if (!supabaseUrl || !supabaseAnonKey) {
                              return { error: 'Server misconfiguration', status: 500 };
                                }

                                  const authClient = createClient(supabaseUrl, supabaseAnonKey);
                                    const { data, error } = await authClient.auth.getUser(token);

                                      if (error || !data?.user) {
                                          return { error: 'Unauthorized', status: 401 };
                                            }

                                              return { user: data.user };
                                              }

                                              // Generic KV routes used by Subscription Agreement save/load.
                                              const handleKvGet = async (c: any) => {
                                                try {
                                                    const auth = await authenticateUser(c);
                                                        if (auth.error) return c.json({ error: auth.error }, auth.status);

                                                            const key = c.req.param('key');
                                                                if (!key) return c.json({ error: 'Missing key' }, 400);

                                                                    const value = await kv.get(key);
                                                                        if (value === undefined || value === null) {
                                                                              return c.json({ error: 'Not found' }, 404);
                                                                                  }

                                                                                      return c.json({ value });
                                                                                        } catch (error: any) {
                                                                                            return c.json({ error: error.message || 'Failed to get key' }, 500);
                                                                                              }
                                                                                              };

                                                                                              app.get(`${PREFIX}/kv/get/:key`, handleKvGet);
                                                                                              app.get('/kv/get/:key', handleKvGet);

                                                                                              const handleKvSet = async (c: any) => {
                                                                                                try {
                                                                                                    const auth = await authenticateUser(c);
                                                                                                        if (auth.error) return c.json({ error: auth.error }, auth.status);

                                                                                                            const body = await c.req.json();
                                                                                                                if (!body?.key) return c.json({ error: 'Missing key' }, 400);

                                                                                                                    let valueToStore = body.value;
                                                                                                                        if (typeof body.value === 'string') {
                                                                                                                              try {
                                                                                                                                      valueToStore = JSON.parse(body.value);
                                                                                                                                            } catch {
                                                                                                                                                    // Keep plain strings as-is.
                                                                                                                                                          }
                                                                                                                                                              }

                                                                                                                                                                  await kv.set(body.key, valueToStore);
                                                                                                                                                                      return c.json({ success: true });
                                                                                                                                                                        } catch (error: any) {
                                                                                                                                                                            return c.json({ error: error.message || 'Failed to set key' }, 500);
                                                                                                                                                                              }
                                                                                                                                                                              };

                                                                                                                                                                              app.post(`${PREFIX}/kv/set`, handleKvSet);
                                                                                                                                                                              app.post('/kv/set', handleKvSet);

                                                                                                                                                                              // Catch Deno HTTP connection closed errors gracefully to prevent unhandled rejection crashes
                                                                                                                                                                              globalThis.addEventListener("unhandledrejection", (e) => {
                                                                                                                                                                                if (e.reason?.name === "Http" || e.reason?.message?.includes("connection closed")) {
                                                                                                                                                                                    e.preventDefault();
                                                                                                                                                                                      }
                                                                                                                                                                                      });

                                                                                                                                                                                      Deno.serve(async (req, info) => {
                                                                                                                                                                                        try {
                                                                                                                                                                                            return await app.fetch(req, info);
                                                                                                                                                                                              } catch (error: any) {
                                                                                                                                                                                                  if (error?.name === 'Http' || error?.message?.includes('connection closed before message completed')) {
                                                                                                                                                                                                        console.warn('Client disconnected before response could be sent:', error.message);
                                                                                                                                                                                                              return new Response(null, { status: 499 });
                                                                                                                                                                                                                  }
                                                                                                                                                                                                                      console.error('Unhandled server error:', error);
                                                                                                                                                                                                                          return new Response('Internal Server Error', { status: 500 });
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                            });