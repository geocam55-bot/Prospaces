import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const azureRoutes = new Hono();

// Initialize Azure OAuth flow (for Outlook/Microsoft 365)
azureRoutes.post('/azure-init', async (c) => {
  try {
    const { redirect_uri, scopes } = await c.req.json();
    
    const azureClientId = Deno.env.get('AZURE_CLIENT_ID');
    const azureTenantId = Deno.env.get('AZURE_TENANT_ID') || 'common';
    
    if (!azureClientId) {
      console.error('Missing Azure credentials in environment');
      return c.json({ error: 'Server configuration error: Missing Azure credentials' }, 500);
    }

    if (!redirect_uri) {
      return c.json({ error: 'Missing required parameter: redirect_uri' }, 400);
    }

    // Default scopes for email and calendar
    const defaultScopes = [
      'openid',
      'profile',
      'email',
      'offline_access',
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/User.Read'
    ];

    const requestedScopes = scopes || defaultScopes;

    // Create state parameter
    const state = JSON.stringify({
      endpoint: 'make-server',
      timestamp: Date.now(),
      provider: 'azure'
    });

    // Construct Azure OAuth URL
    const authUrl = new URL(`https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/authorize`);
    authUrl.searchParams.set('client_id', azureClientId);
    authUrl.searchParams.set('redirect_uri', redirect_uri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', requestedScopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_mode', 'query');

    console.log('Azure OAuth init:', { redirect_uri, scopes: requestedScopes });

    return c.json({ 
      auth_url: authUrl.toString(),
      state: state
    });

  } catch (error: any) {
    console.error('Error in azure-init:', error);
    return c.json({ error: `Azure init error: ${error.message}` }, 500);
  }
});

// Exchange authorization code for access token
azureRoutes.post('/azure-token-exchange', async (c) => {
  try {
    const { code, redirect_uri } = await c.req.json();
    
    const azureClientId = Deno.env.get('AZURE_CLIENT_ID');
    const azureClientSecret = Deno.env.get('AZURE_CLIENT_SECRET');
    const azureTenantId = Deno.env.get('AZURE_TENANT_ID') || 'common';
    
    if (!azureClientId || !azureClientSecret) {
      console.error('Missing Azure credentials in environment');
      return c.json({ error: 'Server configuration error: Missing Azure credentials' }, 500);
    }

    if (!code || !redirect_uri) {
      return c.json({ error: 'Missing required parameters: code and redirect_uri' }, 400);
    }

    console.log('Azure token exchange request');

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: azureClientId,
          client_secret: azureClientSecret,
          code: code,
          redirect_uri: redirect_uri,
          grant_type: 'authorization_code',
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Azure token exchange failed:', tokenResponse.status, errorData);
      return c.json({ 
        error: `Azure token exchange failed: ${tokenResponse.statusText}`,
        details: errorData
      }, tokenResponse.status);
    }

    const tokenData = await tokenResponse.json();
    console.log('Azure token exchange successful');

    // Get user profile from Microsoft Graph
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('Failed to fetch user profile:', profileResponse.status);
      return c.json({ error: 'Failed to fetch user profile' }, 500);
    }

    const profileData = await profileResponse.json();
    console.log('User profile retrieved:', profileData.mail || profileData.userPrincipalName);

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

    // Store the account in Supabase
    if (userId) {
      const accountRecord = {
        user_id: userId,
        azure_user_id: profileData.id,
        email: profileData.mail || profileData.userPrincipalName,
        display_name: profileData.displayName,
        connected: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + (tokenData.expires_in * 1000),
        created_at: new Date().toISOString(),
        provider: 'azure'
      };

      const key = `azure_account:${userId}:${profileData.id}`;
      
      const { error: kvError } = await supabase
        .from('kv_store_8405be07')
        .upsert({
          key: key,
          value: accountRecord,
          updated_at: new Date().toISOString()
        });

      if (kvError) {
        console.error('Failed to store Azure account in database:', kvError);
      } else {
        console.log('Azure account stored successfully:', key);
      }
    }

    return c.json({
      success: true,
      account: {
        id: profileData.id,
        email: profileData.mail || profileData.userPrincipalName,
        display_name: profileData.displayName,
        provider: 'azure',
        connected: true,
      }
    });

  } catch (error: any) {
    console.error('Error in azure-token-exchange:', error);
    return c.json({ error: `Azure token exchange error: ${error.message}` }, 500);
  }
});

// Refresh Azure access token
azureRoutes.post('/azure-refresh-token', async (c) => {
  try {
    const { refresh_token } = await c.req.json();
    
    const azureClientId = Deno.env.get('AZURE_CLIENT_ID');
    const azureClientSecret = Deno.env.get('AZURE_CLIENT_SECRET');
    const azureTenantId = Deno.env.get('AZURE_TENANT_ID') || 'common';
    
    if (!azureClientId || !azureClientSecret) {
      return c.json({ error: 'Server configuration error' }, 500);
    }

    if (!refresh_token) {
      return c.json({ error: 'Missing refresh_token' }, 400);
    }

    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: azureClientId,
          client_secret: azureClientSecret,
          refresh_token: refresh_token,
          grant_type: 'refresh_token',
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Azure token refresh failed:', errorData);
      return c.json({ error: 'Token refresh failed' }, tokenResponse.status);
    }

    const tokenData = await tokenResponse.json();

    return c.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    });

  } catch (error: any) {
    console.error('Error in azure-refresh-token:', error);
    return c.json({ error: `Token refresh error: ${error.message}` }, 500);
  }
});

export { azureRoutes };
