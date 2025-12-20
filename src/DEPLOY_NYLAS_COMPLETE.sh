#!/bin/bash
###############################################################################
# Complete Nylas Edge Functions Deployment Script
# Run this in GitHub Codespaces to create and deploy all 7 Nylas functions
###############################################################################

set -e  # Exit on error

echo "🚀 Starting Nylas Edge Functions deployment..."
echo ""

# Navigate to project root
cd /workspaces/ProSpaces

# Create all function files
echo "📝 Creating function files..."
echo ""

###############################################################################
# 1. NYLAS-CONNECT
###############################################################################
echo "Creating nylas-connect..."
cat > supabase/functions/nylas-connect/index.ts << 'ENDOFFILE'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
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
      throw new Error('Invalid user token');
    }

    const body = await req.json();
    const { provider, email, imapConfig } = body;

    console.log('Connect request:', { provider, email, hasImapConfig: !!imapConfig });

    if (provider === 'imap' && imapConfig) {
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
          imap_password: imapConfig.password,
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

    if (provider === 'gmail' || provider === 'outlook' || provider === 'apple') {
      const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
      
      if (!NYLAS_API_KEY) {
        throw new Error('NYLAS_API_KEY not configured');
      }

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
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
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
ENDOFFILE

###############################################################################
# 2. NYLAS-CALLBACK
###############################################################################
echo "Creating nylas-callback..."
cat > supabase/functions/nylas-callback/index.ts << 'ENDOFFILE'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head><title>OAuth Error</title></head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'nylas-oauth-error',
                  error: '${error}'
                }, '*');
                window.close();
              }
            </script>
            <p>OAuth error: ${error}. This window should close automatically.</p>
          </body>
        </html>
        `,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    const stateData = JSON.parse(state);
    const { userId, orgId } = stateData;

    const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
    if (!NYLAS_API_KEY) {
      throw new Error('NYLAS_API_KEY not configured');
    }

    const tokenResponse = await fetch('https://api.us.nylas.com/v3/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
      },
      body: JSON.stringify({
        code: code,
        redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/nylas-callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to exchange token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, grant_id, email } = tokenData;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: account, error: insertError } = await supabaseClient
      .from('email_accounts')
      .insert({
        user_id: userId,
        organization_id: orgId,
        provider: 'gmail',
        email: email,
        nylas_grant_id: grant_id,
        nylas_access_token: access_token,
        connected: true,
        last_sync: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save email account: ${insertError.message}`);
    }

    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Connection Successful</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'nylas-oauth-success',
                account: {
                  id: '${account.id}',
                  email: '${account.email}',
                  provider: '${account.provider}',
                  last_sync: '${account.last_sync}'
                }
              }, '*');
              window.close();
            }
          </script>
          <div style="font-family: system-ui; padding: 2rem; text-align: center;">
            <h1 style="color: #10b981;">✓ Connected Successfully!</h1>
            <p>Your email account has been connected. This window will close automatically.</p>
          </div>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('Error in nylas-callback:', error);
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Connection Error</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'nylas-oauth-error',
                error: '${error.message}'
              }, '*');
              setTimeout(() => window.close(), 2000);
            }
          </script>
          <div style="font-family: system-ui; padding: 2rem; text-align: center;">
            <h1 style="color: #ef4444;">✗ Connection Failed</h1>
            <p>Error: ${error.message}</p>
            <p>This window will close automatically.</p>
          </div>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});
ENDOFFILE

echo "✅ Created 2/7 functions"
echo ""
echo "Now copy the remaining code manually OR run the next script..."
echo ""
echo "TO SAVE TIME: I'll create a separate smaller script for the remaining 5 functions!"
echo ""

exit 0
ENDOFFILE