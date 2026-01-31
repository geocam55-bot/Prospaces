import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

export const azureOAuthInit = (app: Hono) => {
  app.post('/make-server-8405be07/azure-oauth-init', async (c) => {
    try {
      const authHeader = c.req.header('Authorization');
      if (!authHeader) {
        return c.json({ error: 'No authorization header' }, 401);
      }

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();

      if (userError || !user) {
        return c.json({ error: 'Invalid user token' }, 401);
      }

      const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
      const AZURE_REDIRECT_URI = Deno.env.get('AZURE_REDIRECT_URI');

      console.log('Azure OAuth Init Debug:', {
        hasClientId: !!AZURE_CLIENT_ID,
        hasRedirectUri: !!AZURE_REDIRECT_URI,
        redirectUriValue: AZURE_REDIRECT_URI // Safe to log URI, helpful for debugging typos
      });

      if (!AZURE_CLIENT_ID || !AZURE_REDIRECT_URI) {
        console.error('Missing configuration:', {
          AZURE_CLIENT_ID: !!AZURE_CLIENT_ID,
          AZURE_REDIRECT_URI: !!AZURE_REDIRECT_URI
        });
        return c.json({ error: 'Azure OAuth not configured. Set AZURE_CLIENT_ID and AZURE_REDIRECT_URI in Supabase secrets.' }, 500);
      }

      const state = crypto.randomUUID();
      
      // Store state in Supabase for verification on callback
      const { error: stateError } = await supabaseClient.from('oauth_states').insert({
        state: state,
        user_id: user.id,
        provider: 'azure',
        created_at: new Date().toISOString(),
      });

      if (stateError) {
        console.error('Error storing state:', stateError);
      }

      const scopes = [
        'offline_access',
        'Mail.Read',
        'Mail.ReadWrite',
        'Mail.Send',
        'User.Read',
      ].join(' ');

      const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      authUrl.searchParams.set('client_id', AZURE_CLIENT_ID);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', AZURE_REDIRECT_URI);
      authUrl.searchParams.set('response_mode', 'query');
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('prompt', 'consent');

      return c.json({
        success: true,
        authUrl: authUrl.toString(),
      });

    } catch (error) {
      console.error('Error in azure-oauth-init:', error);
      return c.json({
        success: false,
        error: error.message,
      }, 400);
    }
  });
};
