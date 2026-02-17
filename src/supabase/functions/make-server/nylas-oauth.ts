import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ⬇️⬇️⬇️ EMERGENCY OVERRIDE ⬇️⬇️⬇️
// If you continue to see "Redirect URI not allowed" errors:
// 1. Go to Nylas Dashboard > App Settings > Authentication
// 2. Copy ONE valid "Allowed Callback URI"
// 3. Paste it inside the quotes below
const MANUAL_CALLBACK_URL = ""; 
// ⬆️⬆️⬆️ ----------------------- ⬆️⬆️⬆️

export const nylasOAuth = (app: Hono) => {
  
  // 1. Get the Supabase Edge Function URL (Backend-Centric)
  const getBackendUrl = (req: Request) => {
    const url = new URL(req.url);
    url.search = '';

    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      url.protocol = 'https:';
    }

    if (url.hostname.endsWith('.supabase.co') && !url.pathname.startsWith('/functions/v1/')) {
        const path = url.pathname.startsWith('/') ? url.pathname : `/${url.pathname}`;
        url.pathname = `/functions/v1${path}`;
    }

    const parts = url.pathname.split('/');
    const lastPart = parts[parts.length - 1];
    
    if (lastPart === 'nylas-connect' || lastPart === 'nylas-token-exchange') {
        parts[parts.length - 1] = 'nylas-callback';
    }
    
    url.pathname = parts.join('/');
    return url.toString();
  };

  // 2. Determine the best Redirect URI to use
  const determineRedirectUri = (req: Request, clientProvided?: string) => {
    // A. Manual Override (Hardcoded safety net)
    if (MANUAL_CALLBACK_URL && MANUAL_CALLBACK_URL.length > 0) {
        return MANUAL_CALLBACK_URL;
    }

    // B. Client Provided (Frontend-Centric)
    // If the frontend explicitly sends a URI (and it's not localhost), we trust it.
    // This supports Vercel deployments where the dashboard is configured for the frontend.
    if (clientProvided && !clientProvided.includes('localhost') && !clientProvided.includes('127.0.0.1')) {
        return clientProvided;
    }

    // C. Environment Variable (Config-Centric)
    // If a specific env var is set, use it.
    const envVar = Deno.env.get('NYLAS_REDIRECT_URI') || Deno.env.get('CALENDAR_REDIRECT_URI');
    if (envVar && !envVar.includes('localhost') && !envVar.includes('127.0.0.1')) {
        // Smart fix: If env var is just a domain, append the callback path
        if (!envVar.includes('nylas-callback')) {
            return envVar.endsWith('/') ? `${envVar}nylas-callback` : `${envVar}/nylas-callback`;
        }
        return envVar;
    }

    // D. Backend Fallback (Backend-Centric)
    // If nothing else is configured, generate the Supabase URL.
    return getBackendUrl(req);
  };

  // Init route handler
  const initHandler = async (c: any) => {
    try {
      const body = await c.req.json();
      const { provider, email, redirect_uri, endpoint } = body;
      
      const authHeader = c.req.header('Authorization');
      if (!authHeader) {
        return c.json({ error: 'Authorization header required' }, 401);
      }

      const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
      const NYLAS_CLIENT_ID = Deno.env.get('NYLAS_CLIENT_ID') || NYLAS_API_KEY;
      
      const finalRedirectUri = determineRedirectUri(c.req.raw, redirect_uri);
      
      console.log('Nylas Auth Config:', { 
        finalRedirectUri,
        provider,
        source: MANUAL_CALLBACK_URL ? 'Manual Override' : (finalRedirectUri === redirect_uri ? 'Client Provided' : 'Backend/Env')
      });

      if (!NYLAS_API_KEY) return c.json({ error: 'Missing NYLAS_API_KEY' }, 500);
      if (!NYLAS_CLIENT_ID) return c.json({ error: 'Missing NYLAS_CLIENT_ID' }, 500);

      const nylasProviderMap: Record<string, string> = {
        gmail: 'google',
        outlook: 'microsoft',
        apple: 'icloud',
      };
      
      let nylasProvider = nylasProviderMap[provider] || provider;
      if (provider === 'outlook') nylasProvider = 'microsoft';
      
      let scopes: string[] = ['email', 'calendar'];
      if (nylasProvider === 'google') {
         scopes = [
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/gmail.modify",
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events",
        ];
      } else if (nylasProvider === 'microsoft') {
        scopes = [
            'User.Read',
            'Mail.Read', 
            'Mail.Send',
            'Calendars.Read',
            'Calendars.ReadWrite',
            'offline_access'
        ];
      }

      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      
      if (userError || !user) {
        return c.json({ error: 'Invalid user token' }, 401);
      }

      const state = JSON.stringify({
          userId: user.id,
          orgId: user.user_metadata?.organizationId || 'default_org',
          provider: provider,
          endpoint: endpoint 
      });

      const requestBody = {
        client_id: NYLAS_CLIENT_ID,
        provider: nylasProvider,
        redirect_uri: finalRedirectUri,
        state: state,
        scope: scopes,
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

        let friendlyError = `Failed to get auth URL from Nylas: ${errorText}`;
        try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error?.type === 'api.invalid_query_params' && errorJson.error?.message?.includes('RedirectURI')) {
                friendlyError = `⚠️ Configuration Required\n\nNylas rejected the Redirect URI.\n\nRequested URI: ${finalRedirectUri}\n\nOPTIONS TO FIX:\n1. Add the URI above to "Allowed Callback URIs" in Nylas Dashboard.\n2. OR Update your NYLAS_REDIRECT_URI env var to match what is in your dashboard.\n3. OR Edit nylas-oauth.ts and paste your URI into MANUAL_CALLBACK_URL.`;
            }
        } catch (e) { }
        return c.json({ error: friendlyError }, 400);
      }
      
      const data = await response.json();
      let authUrl = data.data?.url || data.auth_url;

      if (nylasProvider === 'microsoft' && authUrl) {
        try {
            const urlObj = new URL(authUrl);
            urlObj.searchParams.set('prompt', 'login');
            authUrl = urlObj.toString();
        } catch (e) {}
      }

      return c.json({ success: true, authUrl: authUrl });

    } catch (error) {
      console.error('Nylas init error:', error);
      return c.json({ error: error.message }, 400);
    }
  };

  // Token Exchange Handler
  const tokenExchangeHandler = async (c: any) => {
    try {
      const body = await c.req.json();
      const { code, state, redirect_uri } = body;
      
      const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
      const NYLAS_CLIENT_ID = Deno.env.get('NYLAS_CLIENT_ID') || NYLAS_API_KEY;
      
      // Critical: Use the same logic to determine the redirect URI as initHandler did
      // This prevents "redirect_uri mismatch" errors during exchange
      const finalRedirectUri = determineRedirectUri(c.req.raw, redirect_uri);

      const tokenResponse = await fetch('https://api.us.nylas.com/v3/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NYLAS_API_KEY}`
        },
        body: JSON.stringify({
          client_id: NYLAS_CLIENT_ID,
          client_secret: NYLAS_API_KEY,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: finalRedirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokenData);
        return c.json({ error: tokenData.error || 'Failed to exchange token' }, 400);
      }

      let userId, orgId, provider;
      try {
        if (state) {
          const stateObj = JSON.parse(state);
          userId = stateObj.userId;
          orgId = stateObj.orgId;
          provider = stateObj.provider;
        }
      } catch (e) {}

      if (!userId) return c.json({ error: 'Invalid state: missing user ID' }, 400);

      const account = await saveEmailAccount({
        userId,
        orgId,
        provider,
        email: tokenData.email,
        grantId: tokenData.grant_id,
        providerType: tokenData.provider
      });

      return c.json({ success: true, account });

    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  };

  // Callback Handler
  const callbackHandler = async (c: any) => {
    try {
      const code = c.req.query('code');
      const state = c.req.query('state');
      const error = c.req.query('error');
      
      if (error) return c.html(getHtmlResponse({ error }));
      if (!code) return c.html(getHtmlResponse({ error: 'Missing code' }));

      const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
      const NYLAS_CLIENT_ID = Deno.env.get('NYLAS_CLIENT_ID') || NYLAS_API_KEY;
      
      // If we are here, Nylas redirected to the backend.
      // We should use the URI that matches this backend endpoint.
      let NYLAS_REDIRECT_URI = getBackendUrl(c.req.raw);
      
      // Exception: If MANUAL_CALLBACK_URL is set, we must use it (in case it differs slightly but still routed here)
      if (MANUAL_CALLBACK_URL) {
          NYLAS_REDIRECT_URI = MANUAL_CALLBACK_URL;
      }

      console.log('Callback exchanging token with URI:', NYLAS_REDIRECT_URI);

      const tokenResponse = await fetch('https://api.us.nylas.com/v3/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NYLAS_API_KEY}`
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
         return c.html(getHtmlResponse({ error: tokenData.error || 'Failed to exchange token' }));
      }

      let userId, orgId, provider;
      try {
        if (state) {
          const stateObj = JSON.parse(state);
          userId = stateObj.userId;
          orgId = stateObj.orgId;
          provider = stateObj.provider;
        }
      } catch (e) {}

      if (!userId) return c.html(getHtmlResponse({ error: 'Invalid state' }));

      const account = await saveEmailAccount({
        userId,
        orgId,
        provider,
        email: tokenData.email,
        grantId: tokenData.grant_id,
        providerType: tokenData.provider
      });

      return c.html(getHtmlResponse({ success: true, account }));

    } catch (error) {
      return c.html(getHtmlResponse({ error: error.message }));
    }
  };

  const healthHandler = async (c: any) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  };

  app.post('*', async (c: any, next: any) => {
    const path = c.req.path;
    if (path.endsWith('/nylas-connect')) return initHandler(c);
    if (path.endsWith('/nylas-token-exchange')) return tokenExchangeHandler(c);
    await next();
  });

  app.get('*', async (c: any, next: any) => {
    const path = c.req.path;
    if (path.endsWith('/nylas-callback')) return callbackHandler(c);
    if (path.endsWith('/nylas-health')) return healthHandler(c);
    await next();
  });
};

async function saveEmailAccount({ userId, orgId, provider, email, grantId, providerType }: any) {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let appProvider = provider || 'gmail'; 
    if (providerType === 'microsoft') appProvider = 'outlook';
    if (providerType === 'icloud') appProvider = 'apple';
    if (providerType === 'google') appProvider = 'gmail';

    const accountData = {
      user_id: userId,
      organization_id: orgId,
      provider: appProvider,
      email: email,
      nylas_grant_id: grantId,
      connected: true,
      updated_at: new Date().toISOString(),
    };

    const { data: existingAccount } = await supabaseClient
      .from('email_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('email', email)
      .single();

    if (existingAccount) {
      const { data, error } = await supabaseClient
        .from('email_accounts')
        .update(accountData)
        .eq('id', existingAccount.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabaseClient
        .from('email_accounts')
        .insert({ ...accountData, created_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
}

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
