import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

export const nylasOAuth = (app: Hono) => {
  // Init route
  app.post('/make-server-8405be07/nylas-connect', async (c) => {
    try {
      const body = await c.req.json();
      const { provider, email } = body;
      
      const NYLAS_CLIENT_ID = Deno.env.get('NYLAS_CLIENT_ID');
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const defaultRedirectUri = `${SUPABASE_URL}/functions/v1/make-server-8405be07/nylas-callback`;
      const NYLAS_REDIRECT_URI = Deno.env.get('NYLAS_REDIRECT_URI') || defaultRedirectUri;
      
      console.log('Nylas Auth Config:', { 
        hasClientId: !!NYLAS_CLIENT_ID, 
        redirectUri: NYLAS_REDIRECT_URI,
        provider 
      });

      // If the user hasn't set NYLAS_CLIENT_ID, we can't proceed.
      if (!NYLAS_CLIENT_ID) {
        return c.json({ 
          error: 'Nylas not configured. Set NYLAS_CLIENT_ID in Supabase secrets.' 
        }, 500);
      }

      // For Nylas v3
      const authUrl = new URL('https://api.us.nylas.com/v3/connect/auth');
      authUrl.searchParams.set('client_id', NYLAS_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', NYLAS_REDIRECT_URI || ''); // If empty, Nylas might error or use default
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scopes', 'email.read_only email.send calendar.read_only calendar.read_write contacts.read_only');
      authUrl.searchParams.set('provider', provider);
      if (email) authUrl.searchParams.set('login_hint', email);
      
      // State handling
      const state = crypto.randomUUID();
       const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      // Get user from auth header
      const authHeader = c.req.header('Authorization');
      if (authHeader) {
         const userClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
             await supabaseClient.from('oauth_states').insert({
                state: state,
                user_id: user.id,
                provider: 'nylas',
                created_at: new Date().toISOString(),
             });
             authUrl.searchParams.set('state', state);
        }
      }

      return c.json({
        success: true,
        authUrl: authUrl.toString(),
      });

    } catch (error) {
      console.error('Nylas init error:', error);
      return c.json({ error: error.message }, 400);
    }
  });

  // Callback route (if we handle it on server)
  // Usually the redirect URI points here
  app.get('/make-server-8405be07/nylas-callback', async (c) => {
     // ... Implementation similar to azure-oauth-callback
     // For now, let's assume the user might not have set this up yet, 
     // but we need the route to exist if we point the init there.
     
     // Wait, if the user said "I'm using the free version", they might be using the Nylas Dashboard to set the redirect URI.
     // The redirect URI should point to this endpoint probably: 
     // https://<project>.supabase.co/functions/v1/make-server-8405be07/nylas-callback
     
    try {
      const code = c.req.query('code');
      const state = c.req.query('state');
      const error = c.req.query('error');

      if (error) {
        return c.html(`<h1>Error: ${error}</h1>`);
      }
      
      const NYLAS_CLIENT_ID = Deno.env.get('NYLAS_CLIENT_ID');
      const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
      const NYLAS_REDIRECT_URI = Deno.env.get('NYLAS_REDIRECT_URI');

      if (!NYLAS_CLIENT_ID || !NYLAS_API_KEY) {
           return c.html(`<h1>Error: Missing Nylas Config</h1>`);
      }

      // Exchange code
      const tokenResponse = await fetch('https://api.us.nylas.com/v3/connect/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              client_id: NYLAS_CLIENT_ID,
              client_secret: NYLAS_API_KEY,
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: NYLAS_REDIRECT_URI, 
          })
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
          return c.html(`<h1>Error exchanging token: ${JSON.stringify(tokenData)}</h1>`);
      }
      
      // In a real app we would store this token.
      // Access token, grant_id, etc.
      // tokenData: { access_token, grant_id, email, ... }
      
      // Store in DB
       const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      // Verify state to get user_id
      const { data: stateData } = await supabaseClient
        .from('oauth_states')
        .select('*')
        .eq('state', state)
        .single();
        
      if (stateData) {
          await supabaseClient.from('email_accounts').upsert({
              user_id: stateData.user_id,
              provider: stateData.provider || 'nylas', // or specific provider from tokenData if available
              email: tokenData.email,
              nylas_grant_id: tokenData.grant_id,
              access_token: tokenData.access_token, // Nylas v3 uses access_token as API key for requests usually? No, grant_id is used in path, API key in header.
              // Wait, Nylas v3 uses API Key + Grant ID.
              connected: true,
              updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, email' });
          
          // Cleanup state
          await supabaseClient.from('oauth_states').delete().eq('id', stateData.id);
      }
      
      return c.html(`
        <script>
          window.opener.postMessage({ type: 'nylas-oauth-success', account: { email: '${tokenData.email}' } }, '*');
          window.close();
        </script>
      `);

    } catch (e) {
        return c.html(`<h1>Error: ${e.message}</h1>`);
    }
  });
};
