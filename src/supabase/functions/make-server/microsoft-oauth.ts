import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const microsoftRoutes = new Hono();

// Microsoft OAuth Configuration
const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET');
const AZURE_TENANT_ID = Deno.env.get('AZURE_TENANT_ID') || 'common';
const AZURE_REDIRECT_URI = Deno.env.get('AZURE_REDIRECT_URI') || Deno.env.get('APP_URL') + '/oauth-callback';

// Microsoft Graph API Scopes
const MAIL_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'https://graph.microsoft.com/Mail.ReadWrite',
  'https://graph.microsoft.com/Mail.Send',
  'https://graph.microsoft.com/User.Read',
];

const CALENDAR_SCOPES = [
  'https://graph.microsoft.com/Calendars.ReadWrite',
];

// Health check endpoint
microsoftRoutes.get('/make-server-8405be07/microsoft-health', (c) => {
  const hasCredentials = !!(AZURE_CLIENT_ID && AZURE_CLIENT_SECRET);
  return c.json({ 
    status: hasCredentials ? 'ok' : 'missing_credentials',
    service: 'microsoft-oauth',
    timestamp: new Date().toISOString(),
    configured: hasCredentials
  });
});

// Initialize OAuth flow
microsoftRoutes.post('/make-server-8405be07/microsoft-oauth-init', async (c) => {
  try {
    const { scopes, includeCalendar, userId } = await c.req.json();

    if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
      console.error('Missing Azure OAuth credentials');
      return c.json({ 
        error: 'Server configuration error: Missing Azure OAuth credentials. Please set AZURE_CLIENT_ID and AZURE_CLIENT_SECRET.' 
      }, 500);
    }

    // Combine Mail and Calendar scopes if requested
    let requestedScopes = scopes || MAIL_SCOPES;
    if (includeCalendar) {
      requestedScopes = [...new Set([...requestedScopes, ...CALENDAR_SCOPES])];
    }

    // Create state parameter with user context
    const state = JSON.stringify({
      provider: 'microsoft',
      userId: userId,
      timestamp: Date.now(),
      includeCalendar: includeCalendar || false
    });

    // Encode state for URL
    const encodedState = encodeURIComponent(state);

    // Build Microsoft OAuth URL
    const authUrl = new URL(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/authorize`);
    authUrl.searchParams.set('client_id', AZURE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', AZURE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', requestedScopes.join(' '));
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('state', encodedState);

    console.log('[Microsoft OAuth] Initiated flow for user:', userId);

    return c.json({
      success: true,
      authUrl: authUrl.toString(),
      provider: 'microsoft',
      state: encodedState
    });

  } catch (error: any) {
    console.error('[Microsoft OAuth Init] Error:', error);
    return c.json({ 
      error: error.message || 'Failed to initialize Microsoft OAuth' 
    }, 500);
  }
});

// Handle OAuth callback and exchange code for tokens
microsoftRoutes.post('/make-server-8405be07/microsoft-oauth-exchange', async (c) => {
  try {
    const { code, state } = await c.req.json();

    if (!code) {
      return c.json({ error: 'Missing authorization code' }, 400);
    }

    if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
      return c.json({ error: 'Missing Azure OAuth credentials' }, 500);
    }

    // Parse state to get user context
    let stateData: any = {};
    try {
      stateData = JSON.parse(decodeURIComponent(state));
    } catch (e) {
      console.error('[Microsoft OAuth] Failed to parse state:', e);
    }

    console.log('[Microsoft OAuth] Exchanging code for tokens...');

    // Exchange authorization code for access token
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: AZURE_CLIENT_ID,
          client_secret: AZURE_CLIENT_SECRET,
          code: code,
          redirect_uri: AZURE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }).toString(),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[Microsoft OAuth] Token exchange failed:', errorData);
      return c.json({ 
        error: 'Failed to exchange authorization code',
        details: errorData 
      }, 400);
    }

    const tokens = await tokenResponse.json();

    console.log('[Microsoft OAuth] Tokens received successfully');

    // Get user info from Microsoft Graph
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('[Microsoft OAuth] Failed to fetch user info');
      return c.json({ error: 'Failed to fetch user information' }, 400);
    }

    const userInfo = await userInfoResponse.json();
    const userEmail = userInfo.mail || userInfo.userPrincipalName;

    console.log('[Microsoft OAuth] User email:', userEmail);

    // Calculate token expiration
    const expiresAt = Date.now() + (tokens.expires_in * 1000);

    // Store tokens in KV store
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope,
      token_type: tokens.token_type,
      provider: 'microsoft',
      email: userEmail,
      updated_at: new Date().toISOString()
    };

    // Store with userId if available
    const userId = stateData.userId;
    if (userId) {
      await kv.set(`oauth:microsoft:user:${userId}:${userEmail}`, tokenData);
      await kv.set(`oauth:microsoft:email:${userEmail}`, tokenData);
    } else {
      await kv.set(`oauth:microsoft:email:${userEmail}`, tokenData);
    }

    console.log('[Microsoft OAuth] Tokens stored successfully');

    // Store account in Supabase database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get or create user profile
    let profileId = userId;
    if (!profileId && userEmail) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single();
      
      profileId = profile?.id;
    }

    if (profileId) {
      // Check if account already exists
      const { data: existingAccount } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('email', userEmail)
        .eq('user_id', profileId)
        .single();

      if (existingAccount) {
        // Update existing account
        const { error: updateError } = await supabase
          .from('email_accounts')
          .update({
            provider: 'outlook',
            oauth_connected: true,
            last_sync: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAccount.id);

        if (updateError) {
          console.error('[Microsoft OAuth] Failed to update account:', updateError);
        }
      } else {
        // Create new account
        const { error: insertError } = await supabase
          .from('email_accounts')
          .insert({
            user_id: profileId,
            email: userEmail,
            provider: 'outlook',
            oauth_connected: true,
            last_sync: new Date().toISOString(),
          });

        if (insertError) {
          console.error('[Microsoft OAuth] Failed to insert account:', insertError);
        }
      }
    }

    return c.json({
      success: true,
      account: {
        email: userEmail,
        provider: 'microsoft',
        name: userInfo.displayName,
      },
      hasRefreshToken: !!tokens.refresh_token
    });

  } catch (error: any) {
    console.error('[Microsoft OAuth Exchange] Error:', error);
    return c.json({ 
      error: error.message || 'Failed to complete OAuth exchange' 
    }, 500);
  }
});

// Refresh access token
microsoftRoutes.post('/make-server-8405be07/microsoft-refresh-token', async (c) => {
  try {
    const { email, userId } = await c.req.json();

    if (!email && !userId) {
      return c.json({ error: 'Missing email or userId' }, 400);
    }

    // Retrieve stored tokens
    let tokenData: any;
    if (userId && email) {
      tokenData = await kv.get(`oauth:microsoft:user:${userId}:${email}`);
    }
    if (!tokenData && email) {
      tokenData = await kv.get(`oauth:microsoft:email:${email}`);
    }

    if (!tokenData || !tokenData.refresh_token) {
      return c.json({ 
        error: 'No refresh token found. User needs to re-authenticate.' 
      }, 401);
    }

    console.log('[Microsoft OAuth] Refreshing access token for:', email);

    // Request new access token
    const refreshResponse = await fetch(
      `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: AZURE_CLIENT_ID!,
          client_secret: AZURE_CLIENT_SECRET!,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }).toString(),
      }
    );

    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.text();
      console.error('[Microsoft OAuth] Token refresh failed:', errorData);
      return c.json({ 
        error: 'Failed to refresh access token',
        details: errorData 
      }, 401);
    }

    const newTokens = await refreshResponse.json();

    // Update stored tokens
    const updatedTokenData = {
      ...tokenData,
      access_token: newTokens.access_token,
      expires_at: Date.now() + (newTokens.expires_in * 1000),
      updated_at: new Date().toISOString()
    };

    // Store updated tokens
    if (userId && email) {
      await kv.set(`oauth:microsoft:user:${userId}:${email}`, updatedTokenData);
    }
    if (email) {
      await kv.set(`oauth:microsoft:email:${email}`, updatedTokenData);
    }

    console.log('[Microsoft OAuth] Access token refreshed successfully');

    return c.json({
      success: true,
      access_token: newTokens.access_token,
      expires_at: updatedTokenData.expires_at
    });

  } catch (error: any) {
    console.error('[Microsoft OAuth Refresh] Error:', error);
    return c.json({ 
      error: error.message || 'Failed to refresh token' 
    }, 500);
  }
});

// Get valid access token (refresh if needed)
export async function getMicrosoftAccessToken(email: string, userId?: string): Promise<string> {
  // Retrieve stored tokens
  let tokenData: any;
  if (userId && email) {
    tokenData = await kv.get(`oauth:microsoft:user:${userId}:${email}`);
  }
  if (!tokenData && email) {
    tokenData = await kv.get(`oauth:microsoft:email:${email}`);
  }

  if (!tokenData) {
    throw new Error('No OAuth tokens found for this account');
  }

  // Check if token is expired (with 5 minute buffer)
  const now = Date.now();
  const isExpired = tokenData.expires_at < (now + 5 * 60 * 1000);

  if (isExpired) {
    if (!tokenData.refresh_token) {
      throw new Error('Access token expired and no refresh token available');
    }

    console.log('[Microsoft OAuth] Access token expired, refreshing...');

    // Refresh the token
    const refreshResponse = await fetch(
      `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: AZURE_CLIENT_ID!,
          client_secret: AZURE_CLIENT_SECRET!,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }).toString(),
      }
    );

    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh Microsoft access token');
    }

    const newTokens = await refreshResponse.json();

    // Update stored tokens
    tokenData.access_token = newTokens.access_token;
    tokenData.expires_at = Date.now() + (newTokens.expires_in * 1000);
    tokenData.updated_at = new Date().toISOString();

    // Save updated tokens
    if (userId && email) {
      await kv.set(`oauth:microsoft:user:${userId}:${email}`, tokenData);
    }
    if (email) {
      await kv.set(`oauth:microsoft:email:${email}`, tokenData);
    }
  }

  return tokenData.access_token;
}

export { microsoftRoutes };
