import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

export const nylasOAuth = (app: Hono) => {
  // Init route
  app.post('/make-server-8405be07/nylas-connect', async (c) => {
    try {
      const body = await c.req.json();
      const { provider, email } = body;
      
      const authHeader = c.req.header('Authorization');
      if (!authHeader) {
        return c.json({ error: 'Authorization header required' }, 401);
      }

      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
      // Fallback to API Key as Client ID if not explicitly set (common in Nylas v3)
      const NYLAS_CLIENT_ID = Deno.env.get('NYLAS_CLIENT_ID') || NYLAS_API_KEY;
      
      // Use the generic nylas-callback function which is likely already whitelisted
      const defaultRedirectUri = `${SUPABASE_URL}/functions/v1/nylas-callback`;
      const NYLAS_REDIRECT_URI = Deno.env.get('NYLAS_REDIRECT_URI') || defaultRedirectUri;
      
      console.log('Nylas Auth Config:', { 
        hasClientId: !!NYLAS_CLIENT_ID,
        hasApiKey: !!NYLAS_API_KEY,
        redirectUri: NYLAS_REDIRECT_URI,
        provider 
      });

      if (!NYLAS_API_KEY) {
        return c.json({ 
          error: 'Nylas not configured. Set NYLAS_API_KEY in Supabase secrets.' 
        }, 500);
      }
      
      if (!NYLAS_CLIENT_ID) {
         return c.json({ 
          error: 'Nylas Client ID missing. Set NYLAS_CLIENT_ID or ensure NYLAS_API_KEY is set.' 
        }, 500);
      }

      // Map frontend provider names to Nylas provider names (v3)
      const nylasProviderMap: Record<string, string> = {
        gmail: 'google',
        outlook: 'microsoft',
        apple: 'icloud',
      };
      
      let nylasProvider = nylasProviderMap[provider] || provider;
      if (provider === 'outlook') nylasProvider = 'microsoft'; // Extra safety
      
      // Determine scopes
      let scopes: string[];
      if (nylasProvider === 'google') {
         scopes = [
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/gmail.modify",
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events",
        ];
      } else if (nylasProvider === 'microsoft') {
        // Nylas v3 requires native Microsoft Graph scopes
        scopes = [
            'User.Read',
            'Mail.Read', 
            'Mail.Send',
            'Calendars.Read',
            'Calendars.ReadWrite'
        ];
      } else {
        scopes = ['email', 'calendar'];
      }
      
      // Get user for state
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      
      if (userError || !user) {
        return c.json({ error: 'Invalid user token' }, 401);
      }

      // State handling - JSON format to match nylas-callback expectations
      const state = JSON.stringify({
          userId: user.id,
          orgId: user.user_metadata?.organizationId || 'default_org',
          returnUrl: c.req.header('origin') || c.req.header('referer')
      });

      // Generate OAuth authorization URL using Nylas API
      // This is the preferred method for Nylas v3 Hosted Auth
      const requestBody = {
        client_id: NYLAS_CLIENT_ID,
        provider: nylasProvider,
        redirect_uri: NYLAS_REDIRECT_URI,
        state: state,
        scope: scopes,
        // prompt: 'login' removed because Nylas API rejects it in the body
        login_hint: email
      };
      
      const response = await fetch('https://api.us.nylas.com/v3/connect/auth', {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${NYLAS_API_KEY}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Nylas API error:', errorText);
        throw new Error(`Failed to get auth URL from Nylas: ${errorText}`);
      }
      
      const data = await response.json();
      let authUrl = data.data?.url || data.auth_url;

      if (!authUrl) {
         throw new Error('No auth URL returned from Nylas');
      }

      // Manually append prompt=login for Microsoft since the API rejects it in the body
      // We append it to the returned hosted auth URL, hoping Nylas passes it through
      if (nylasProvider === 'microsoft') {
        try {
            const urlObj = new URL(authUrl);
            urlObj.searchParams.set('prompt', 'login');
            authUrl = urlObj.toString();
        } catch (e) {
            console.warn('Failed to append prompt param to authUrl', e);
        }
      }

      return c.json({
        success: true,
        authUrl: authUrl,
      });

    } catch (error) {
      console.error('Nylas init error:', error);
      return c.json({ error: error.message }, 400);
    }
  });
};
