import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create a Supabase client with the Auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the user from the auth header
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get Azure OAuth credentials from environment
    const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
    const AZURE_REDIRECT_URI = Deno.env.get('AZURE_REDIRECT_URI');

    if (!AZURE_CLIENT_ID || !AZURE_REDIRECT_URI) {
      throw new Error('Azure OAuth not configured. Set AZURE_CLIENT_ID and AZURE_REDIRECT_URI in Supabase secrets.');
    }

    // Generate a state parameter to prevent CSRF
    const state = crypto.randomUUID();
    
    // Store state in Supabase for verification on callback
    await supabaseClient.from('oauth_states').insert({
      state: state,
      user_id: user.id,
      provider: 'azure',
      created_at: new Date().toISOString(),
    });

    // Build the Azure OAuth URL
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
    authUrl.searchParams.set('prompt', 'consent'); // Always show consent screen

    console.log('Azure OAuth URL generated:', authUrl.toString());

    return new Response(
      JSON.stringify({
        success: true,
        authUrl: authUrl.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in azure-oauth-init:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
