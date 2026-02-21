import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { extractUserToken } from './auth-helper.ts';

export const azureOAuthInit = (app: Hono) => {
  // Initiate Microsoft/Outlook OAuth flow
  app.post('/make-server-8405be07/microsoft-oauth-init', async (c) => {
    try {
      console.log('[Azure OAuth] Initiating OAuth flow');
      console.log('[Azure OAuth] Headers debug:', {
        hasAuthorization: !!c.req.header('Authorization'),
        hasXUserToken: !!c.req.header('X-User-Token'),
        authPrefix: c.req.header('Authorization')?.substring(0, 15) + '...',
        xUserTokenPrefix: c.req.header('X-User-Token')?.substring(0, 20) + '...',
      });

      // Use dual-header auth pattern: X-User-Token preferred, Authorization fallback
      const token = extractUserToken(c);
      if (!token) {
        console.error('[Azure OAuth] No user token found in either X-User-Token or Authorization headers');
        return c.json({ error: 'Authorization required. Send X-User-Token or Authorization header.' }, 401);
      }

      console.log('[Azure OAuth] Token extracted, source:', c.req.header('X-User-Token') ? 'X-User-Token' : 'Authorization fallback');

      // Verify user is authenticated
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        console.error('[Azure OAuth] User authentication failed:', {
          error: userError?.message,
          tokenLength: token?.length,
          tokenPrefix: token?.substring(0, 20) + '...',
          hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        });
        return c.json({ 
          error: 'User authentication failed in server/azure-oauth-init: ' + (userError?.message || 'No user found for token')
        }, 401);
      }

      console.log('[Azure OAuth] User authenticated:', user.id, user.email);

      const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
      const AZURE_REDIRECT_URI = Deno.env.get('AZURE_REDIRECT_URI');

      console.log('[Azure OAuth] Config check:', {
        hasClientId: !!AZURE_CLIENT_ID,
        hasRedirectUri: !!AZURE_REDIRECT_URI,
        redirectUri: AZURE_REDIRECT_URI
      });

      if (!AZURE_CLIENT_ID || !AZURE_REDIRECT_URI) {
        console.error('[Azure OAuth] Missing configuration:', {
          AZURE_CLIENT_ID: !!AZURE_CLIENT_ID,
          AZURE_REDIRECT_URI: !!AZURE_REDIRECT_URI
        });
        return c.json({ 
          error: 'Azure OAuth not configured. Set AZURE_CLIENT_ID and AZURE_REDIRECT_URI in Supabase secrets.' 
        }, 500);
      }

      // Generate state parameter for security
      const state = crypto.randomUUID();

      // Store state in KV with user ID (matches Google pattern)
      await kv.set(`oauth_state:${state}`, {
        userId: user.id,
        provider: 'microsoft',
        timestamp: new Date().toISOString()
      }); // Note: KV store does not support TTL/expiresIn; clean up stale entries manually

      const scopes = [
        'offline_access',
        'Mail.Read',
        'Mail.ReadWrite',
        'Mail.Send',
        'User.Read',
        'Calendars.Read',
        'Calendars.ReadWrite',
      ].join(' ');

      const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      authUrl.searchParams.set('client_id', AZURE_CLIENT_ID);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', AZURE_REDIRECT_URI);
      authUrl.searchParams.set('response_mode', 'query');
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('prompt', 'consent');

      console.log('[Azure OAuth] Generated auth URL successfully');

      return c.json({
        success: true,
        authUrl: authUrl.toString(),
        pollId: state,
      });

    } catch (error: any) {
      console.error('[Azure OAuth] Init error:', error);
      return c.json({
        success: false,
        error: error.message,
      }, 500);
    }
  });

  // Health check for Azure OAuth
  app.get('/make-server-8405be07/azure-health', (c) => {
    const clientId = Deno.env.get('AZURE_CLIENT_ID') || '';
    const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET') || '';
    const redirectUri = Deno.env.get('AZURE_REDIRECT_URI') || '';
    
    const configured = !!(clientId && clientSecret && redirectUri);
    
    return c.json({
      status: 'ok',
      configured,
      diagnostics: {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!redirectUri,
      },
      timestamp: new Date().toISOString()
    });
  });
};