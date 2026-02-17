import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { nylasRoutes } from './nylas-oauth.ts';
import { azureRoutes } from './azure-oauth.ts';

const app = new Hono();

// Apply CORS middleware with open headers
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 600,
  credentials: true,
}));

// Apply logger middleware
app.use('*', logger(console.log));

// Health check endpoint
app.get('/make-server/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'make-server'
  });
});

// Nylas-specific health check (for frontend probing)
app.get('/make-server/nylas-health', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'nylas-oauth',
    timestamp: new Date().toISOString()
  });
});

// Mount Nylas OAuth routes
app.route('/make-server', nylasRoutes);

// Mount Azure OAuth routes
app.route('/make-server', azureRoutes);

// Catch-all 404 handler
app.notFound((c) => {
  console.log(`404 Not Found: ${c.req.method} ${c.req.url}`);
  return c.json({ error: 'Not Found', path: c.req.url }, 404);
});

// Global error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ 
    error: 'Internal Server Error', 
    message: err.message,
    timestamp: new Date().toISOString()
  }, 500);
});

// Start the server
Deno.serve(app.fetch);
