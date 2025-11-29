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

    // Create a Supabase client with the Auth context of the user that called the function
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

    // Get the request body
    const body = await req.json();
    const { provider, email, imapConfig } = body;

    console.log('Connect request:', { provider, email, hasImapConfig: !!imapConfig });

    // For IMAP connections
    if (provider === 'imap' && imapConfig) {
      // Store IMAP configuration in the database
      const { data: account, error: insertError } = await supabaseClient
        .from('email_accounts')
        .insert({
          user_id: user.id,
          organization_id: user.user_metadata?.organizationId || 'default_org',
          provider: 'imap',
          email: email,
          imap_host: imapConfig.host,
          imap_port: imapConfig.port,
          imap_username: imapConfig.username,
          imap_password: imapConfig.password, // In production, encrypt this!
          connected: true,
          last_sync: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(`Failed to save IMAP account: ${insertError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          account: {
            id: account.id,
            email: account.email,
            provider: account.provider,
            last_sync: account.last_sync,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // For OAuth connections (Gmail, Outlook, etc.)
    if (provider === 'gmail' || provider === 'outlook' || provider === 'apple') {
      const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
      
      if (!NYLAS_API_KEY) {
        throw new Error('NYLAS_API_KEY not configured');
      }

      // Generate OAuth authorization URL using Nylas API
      const nylasResponse = await fetch('https://api.us.nylas.com/v3/connect/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NYLAS_API_KEY}`,
        },
        body: JSON.stringify({
          provider: provider === 'gmail' ? 'google' : provider,
          redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/nylas-callback`,
          state: JSON.stringify({
            userId: user.id,
            orgId: user.user_metadata?.organizationId || 'default_org',
          }),
          scope: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify',
          ],
        }),
      });

      if (!nylasResponse.ok) {
        const errorText = await nylasResponse.text();
        console.error('Nylas API error:', errorText);
        throw new Error(`Nylas API error: ${errorText}`);
      }

      const nylasData = await nylasResponse.json();

      return new Response(
        JSON.stringify({
          success: true,
          authUrl: nylasData.auth_url,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Invalid provider specified');

  } catch (error) {
    console.error('Error in nylas-connect:', error);
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
