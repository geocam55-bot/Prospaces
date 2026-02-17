import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const nylasRoutes = new Hono();

// Initialize Nylas OAuth flow (for email accounts)
nylasRoutes.post('/nylas-init', async (c) => {
  try {
    const { provider, redirect_uri } = await c.req.json();
    
    const nylasApiKey = Deno.env.get('NYLAS_API_KEY');
    const nylasClientId = Deno.env.get('NYLAS_CLIENT_ID');
    
    if (!nylasApiKey || !nylasClientId) {
      console.error('Missing Nylas credentials in environment');
      return c.json({ error: 'Server configuration error: Missing Nylas credentials' }, 500);
    }

    if (!provider || !redirect_uri) {
      return c.json({ error: 'Missing required parameters: provider and redirect_uri' }, 400);
    }

    // Map provider to Nylas provider string
    const providerMap: Record<string, string> = {
      'gmail': 'google',
      'outlook': 'microsoft',
      'apple': 'icloud',
    };

    const nylasProvider = providerMap[provider];
    if (!nylasProvider) {
      return c.json({ error: `Unsupported provider: ${provider}` }, 400);
    }

    // Create state parameter with endpoint info for callback
    const state = JSON.stringify({
      endpoint: 'make-server',
      timestamp: Date.now(),
      provider: provider
    });

    // Construct Nylas OAuth URL
    const authUrl = new URL('https://api.us.nylas.com/v3/connect/auth');
    authUrl.searchParams.set('client_id', nylasClientId);
    authUrl.searchParams.set('redirect_uri', redirect_uri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('provider', nylasProvider);
    authUrl.searchParams.set('state', state);
    
    // Add email scope for access
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('scope', 'email.read_only email.send email.folders email.metadata');

    console.log('Nylas OAuth init:', { provider, nylasProvider, redirect_uri });

    return c.json({ 
      auth_url: authUrl.toString(),
      state: state
    });

  } catch (error: any) {
    console.error('Error in nylas-init:', error);
    return c.json({ error: `Nylas init error: ${error.message}` }, 500);
  }
});

// Exchange authorization code for access token
nylasRoutes.post('/nylas-token-exchange', async (c) => {
  try {
    const { code, state, redirect_uri } = await c.req.json();
    
    const nylasApiKey = Deno.env.get('NYLAS_API_KEY');
    const nylasClientId = Deno.env.get('NYLAS_CLIENT_ID');
    const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET');
    
    if (!nylasApiKey || !nylasClientId || !nylasClientSecret) {
      console.error('Missing Nylas credentials in environment');
      return c.json({ error: 'Server configuration error: Missing Nylas credentials' }, 500);
    }

    if (!code || !redirect_uri) {
      return c.json({ error: 'Missing required parameters: code and redirect_uri' }, 400);
    }

    console.log('Token exchange request:', { code: code.substring(0, 10) + '...', redirect_uri });

    // Exchange code for access token with Nylas
    const tokenResponse = await fetch('https://api.us.nylas.com/v3/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: nylasClientId,
        client_secret: nylasClientSecret,
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Nylas token exchange failed:', tokenResponse.status, errorData);
      return c.json({ 
        error: `Nylas token exchange failed: ${tokenResponse.statusText}`,
        details: errorData
      }, tokenResponse.status);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful, grant_id:', tokenData.grant_id);

    // Get account information from Nylas
    const accountResponse = await fetch(`https://api.us.nylas.com/v3/grants/${tokenData.grant_id}`, {
      headers: {
        'Authorization': `Bearer ${nylasApiKey}`,
      },
    });

    if (!accountResponse.ok) {
      console.error('Failed to fetch account info:', accountResponse.status);
      return c.json({ error: 'Failed to fetch account information' }, 500);
    }

    const accountData = await accountResponse.json();
    console.log('Account info retrieved:', accountData.email);

    // Get user from Authorization header
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let userId = null;
    if (accessToken) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id;
    }

    // Store the account in Supabase (using kv_store or custom table)
    if (userId) {
      const accountRecord = {
        user_id: userId,
        grant_id: tokenData.grant_id,
        email: accountData.email,
        provider: accountData.provider,
        connected: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
        created_at: new Date().toISOString(),
      };

      // Store in kv_store with key pattern: email_account:{user_id}:{grant_id}
      const key = `email_account:${userId}:${tokenData.grant_id}`;
      
      const { error: kvError } = await supabase
        .from('kv_store_8405be07')
        .upsert({
          key: key,
          value: accountRecord,
          updated_at: new Date().toISOString()
        });

      if (kvError) {
        console.error('Failed to store account in database:', kvError);
      } else {
        console.log('Account stored successfully:', key);
      }
    }

    return c.json({
      success: true,
      account: {
        id: tokenData.grant_id,
        email: accountData.email,
        provider: accountData.provider,
        connected: true,
      }
    });

  } catch (error: any) {
    console.error('Error in nylas-token-exchange:', error);
    return c.json({ error: `Token exchange error: ${error.message}` }, 500);
  }
});

// Initialize Calendar OAuth flow
nylasRoutes.post('/calendar-init', async (c) => {
  try {
    const { provider, redirect_uri } = await c.req.json();
    
    const nylasApiKey = Deno.env.get('NYLAS_API_KEY');
    const nylasClientId = Deno.env.get('NYLAS_CLIENT_ID');
    
    if (!nylasApiKey || !nylasClientId) {
      console.error('Missing Nylas credentials in environment');
      return c.json({ error: 'Server configuration error: Missing Nylas credentials' }, 500);
    }

    if (!provider || !redirect_uri) {
      return c.json({ error: 'Missing required parameters: provider and redirect_uri' }, 400);
    }

    // Map provider to Nylas provider string
    const providerMap: Record<string, string> = {
      'google': 'google',
      'outlook': 'microsoft',
    };

    const nylasProvider = providerMap[provider];
    if (!nylasProvider) {
      return c.json({ error: `Unsupported calendar provider: ${provider}` }, 400);
    }

    // Create state parameter
    const state = JSON.stringify({
      endpoint: 'make-server',
      timestamp: Date.now(),
      provider: provider,
      type: 'calendar'
    });

    // Construct Nylas OAuth URL for calendar
    const authUrl = new URL('https://api.us.nylas.com/v3/connect/auth');
    authUrl.searchParams.set('client_id', nylasClientId);
    authUrl.searchParams.set('redirect_uri', redirect_uri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('provider', nylasProvider);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('scope', 'calendar.read_only calendar.events');

    console.log('Calendar OAuth init:', { provider, nylasProvider, redirect_uri });

    return c.json({ 
      auth_url: authUrl.toString(),
      state: state
    });

  } catch (error: any) {
    console.error('Error in calendar-init:', error);
    return c.json({ error: `Calendar init error: ${error.message}` }, 500);
  }
});

// Calendar token exchange (similar to nylas-token-exchange)
nylasRoutes.post('/calendar-token-exchange', async (c) => {
  try {
    const { code, state, redirect_uri } = await c.req.json();
    
    const nylasApiKey = Deno.env.get('NYLAS_API_KEY');
    const nylasClientId = Deno.env.get('NYLAS_CLIENT_ID');
    const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET');
    
    if (!nylasApiKey || !nylasClientId || !nylasClientSecret) {
      console.error('Missing Nylas credentials in environment');
      return c.json({ error: 'Server configuration error: Missing Nylas credentials' }, 500);
    }

    if (!code || !redirect_uri) {
      return c.json({ error: 'Missing required parameters: code and redirect_uri' }, 400);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.us.nylas.com/v3/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: nylasClientId,
        client_secret: nylasClientSecret,
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Calendar token exchange failed:', tokenResponse.status, errorData);
      return c.json({ 
        error: `Calendar token exchange failed: ${tokenResponse.statusText}`,
        details: errorData
      }, tokenResponse.status);
    }

    const tokenData = await tokenResponse.json();

    // Get account information
    const accountResponse = await fetch(`https://api.us.nylas.com/v3/grants/${tokenData.grant_id}`, {
      headers: {
        'Authorization': `Bearer ${nylasApiKey}`,
      },
    });

    if (!accountResponse.ok) {
      console.error('Failed to fetch calendar account info:', accountResponse.status);
      return c.json({ error: 'Failed to fetch account information' }, 500);
    }

    const accountData = await accountResponse.json();

    // Get user from Authorization header
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let userId = null;
    if (accessToken) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id;
    }

    // Store calendar account
    if (userId) {
      const accountRecord = {
        user_id: userId,
        grant_id: tokenData.grant_id,
        email: accountData.email,
        provider: accountData.provider,
        connected: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
        created_at: new Date().toISOString(),
        type: 'calendar'
      };

      const key = `calendar_account:${userId}:${tokenData.grant_id}`;
      
      const { error: kvError } = await supabase
        .from('kv_store_8405be07')
        .upsert({
          key: key,
          value: accountRecord,
          updated_at: new Date().toISOString()
        });

      if (kvError) {
        console.error('Failed to store calendar account:', kvError);
      }
    }

    return c.json({
      success: true,
      account: {
        id: tokenData.grant_id,
        email: accountData.email,
        provider: accountData.provider,
        connected: true,
      }
    });

  } catch (error: any) {
    console.error('Error in calendar-token-exchange:', error);
    return c.json({ error: `Calendar token exchange error: ${error.message}` }, 500);
  }
});

export { nylasRoutes };
