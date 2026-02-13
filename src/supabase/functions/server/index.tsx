import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { azureOAuthInit } from './azure-oauth-init.ts';
import { azureOAuthCallback } from './azure-oauth-callback.ts';
import { nylasOAuth } from './nylas-oauth.ts';
import { dataMigration } from './data-migration.ts';

const app = new Hono();

app.use('*', cors());

azureOAuthInit(app);
azureOAuthCallback(app);
nylasOAuth(app);
dataMigration(app);

Deno.serve(app.fetch);