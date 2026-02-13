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
      
      // Use the correct callback URL that points to this server function
      const defaultRedirectUri = `${SUPABASE_URL}/functions/v1/make-server-8405be07/nylas-callback`;
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
            'Calendars.ReadWrite',
            'offline_access'
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
          provider: provider // Pass the original provider name
      });

      // Generate OAuth authorization URL using Nylas API
      // This is the preferred method for Nylas v3 Hosted Auth
      const requestBody = {
        client_id: NYLAS_CLIENT_ID,
        provider: nylasProvider,
        redirect_uri: NYLAS_REDIRECT_URI,
        state: state,
        scope: scopes,
        // login_hint removed to ensure user has to type email (avoids auto-selecting wrong state)
        // login_hint: email 
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

  // Callback route
  app.get('/make-server-8405be07/nylas-callback', async (c) => {
    try {
      const code = c.req.query('code');
      const state = c.req.query('state');
      const error = c.req.query('error');
      const errorDescription = c.req.query('error_description');

      if (error) {
        console.error('Nylas OAuth error:', error, errorDescription);
        return c.html(getHtmlResponse({ error: errorDescription || error }));
      }

      if (!code) {
        return c.html(getHtmlResponse({ error: 'Missing authorization code' }));
      }

      const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
      const NYLAS_CLIENT_ID = Deno.env.get('NYLAS_CLIENT_ID') || NYLAS_API_KEY;
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      
      // Must match the init route's redirect URI
      const defaultRedirectUri = `${SUPABASE_URL}/functions/v1/make-server-8405be07/nylas-callback`;
      const NYLAS_REDIRECT_URI = Deno.env.get('NYLAS_REDIRECT_URI') || defaultRedirectUri;

      if (!NYLAS_API_KEY || !NYLAS_CLIENT_ID) {
        return c.html(getHtmlResponse({ error: 'Server configuration error: Missing Nylas keys' }));
      }

      // Exchange code for token
      const tokenResponse = await fetch('https://api.us.nylas.com/v3/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NYLAS_API_KEY}` // API Key is used as secret/token for v3
        },
        body: JSON.stringify({
          client_id: NYLAS_CLIENT_ID,
          client_secret: NYLAS_API_KEY,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: NYLAS_REDIRECT_URI,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokenData);
        return c.html(getHtmlResponse({ error: tokenData.error || 'Failed to exchange token' }));
      }

      // Parse state to get user context
      let userId, orgId, provider;
      try {
        if (state) {
          const stateObj = JSON.parse(state);
          userId = stateObj.userId;
          orgId = stateObj.orgId;
          provider = stateObj.provider;
        }
      } catch (e) {
        console.error('Failed to parse state:', e);
      }

      if (!userId) {
         return c.html(getHtmlResponse({ error: 'Invalid state: missing user ID' }));
      }

      const grantId = tokenData.grant_id;
      const email = tokenData.email;
      const providerType = tokenData.provider; // google, microsoft, etc.

      // Map back to our provider names
      let appProvider = provider || 'gmail'; // Default to gmail if unknown
      if (providerType === 'microsoft') appProvider = 'outlook';
      if (providerType === 'icloud') appProvider = 'apple';
      if (providerType === 'google') appProvider = 'gmail';

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Store/Update account in database
      const accountData = {
        user_id: userId,
        organization_id: orgId,
        provider: appProvider,
        email: email,
        nylas_grant_id: grantId,
        connected: true,
        updated_at: new Date().toISOString(),
      };

      // Check if account exists
      const { data: existingAccount } = await supabaseClient
        .from('email_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('email', email)
        .single();

      let resultAccount;

      if (existingAccount) {
        const { data, error } = await supabaseClient
          .from('email_accounts')
          .update(accountData)
          .eq('id', existingAccount.id)
          .select()
          .single();
        if (error) throw error;
        resultAccount = data;
      } else {
        const { data, error } = await supabaseClient
          .from('email_accounts')
          .insert({ ...accountData, created_at: new Date().toISOString() })
          .select()
          .single();
        if (error) throw error;
        resultAccount = data;
      }

      return c.html(getHtmlResponse({ 
        success: true, 
        account: {
          id: resultAccount.id,
          email: resultAccount.email,
          last_sync: resultAccount.updated_at
        }
      }));

    } catch (error) {
      console.error('Nylas Callback error:', error);
      return c.html(getHtmlResponse({ error: error.message }));
    }
  });
};

function getHtmlResponse(data: any) {
  const jsonData = JSON.stringify(data);
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authentication Complete</title>
      </head>
      <body>
        <div style="font-family: system-ui, sans-serif; text-align: center; padding: 40px;">
          <h2>${data.success ? 'Authentication Successful' : 'Authentication Failed'}</h2>
          <p>${data.error || 'You can close this window now.'}</p>
        </div>
        <script>
          const data = ${jsonData};
          const message = data.success 
            ? { type: 'nylas-oauth-success', account: data.account }
            : { type: 'nylas-oauth-error', error: data.error };
            
          if (window.opener) {
            window.opener.postMessage(message, '*');
            setTimeout(() => window.close(), 1000);
          }
        </script>
      </body>
    </html>
  `;
}
