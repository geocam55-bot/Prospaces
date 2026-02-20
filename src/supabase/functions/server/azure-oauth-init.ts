import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

export const azureOAuthInit = (app: Hono) => {
  // Initiate Microsoft/Outlook OAuth flow
  app.post('/make-server-8405be07/microsoft-oauth-init', async (c) => {
    try {
      console.log('[Azure OAuth] Initiating OAuth flow');

      const authHeader = c.req.header('Authorization');
      if (!authHeader) {
        return c.json({ error: 'Authorization header required' }, 401);
      }

      // Verify user is authenticated
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

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
      }, { expiresIn: 600 }); // 10 minutes

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
    
    const configured = !!(clientId && clientSecret);
    
    // Show enough to diagnose without exposing the full secret
    const maskSecret = (s: string) => {
      if (!s) return '(empty)';
      if (s.length < 8) return `(${s.length} chars)`;
      return `${s.substring(0, 4)}...${s.substring(s.length - 4)} (${s.length} chars)`;
    };
    
    return c.json({
      status: 'ok',
      configured,
      diagnostics: {
        clientId: clientId ? `${clientId.substring(0, 8)}... (${clientId.length} chars)` : '(empty)',
        clientSecret: maskSecret(clientSecret),
        secretLooksLikeGuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientSecret),
        secretContainsTilde: clientSecret.includes('~'),
        redirectUri: redirectUri || '(empty)',
      },
      timestamp: new Date().toISOString()
    });
  });
};