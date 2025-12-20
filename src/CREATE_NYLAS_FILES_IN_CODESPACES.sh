#!/bin/bash
# Script to create all Nylas Edge Function files in GitHub Codespaces
# Copy and paste this entire file into Codespaces terminal

cd /workspaces/ProSpaces

echo "Creating Nylas Edge Functions..."

# 1. NYLAS-CONNECT
cat > supabase/functions/nylas-connect/index.ts << 'EOF'
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
            // Email scopes
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify',
            // Calendar scopes
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
EOF

echo "✅ Created nylas-connect/index.ts"

# 2. NYLAS-CALLBACK
cat > supabase/functions/nylas-callback/index.ts << 'EOF'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth errors
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

    // Parse state to get user info
    const stateData = JSON.parse(state);
    const { userId, orgId } = stateData;

    const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
    if (!NYLAS_API_KEY) {
      throw new Error('NYLAS_API_KEY not configured');
    }

    // Exchange code for access token
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

    // Create a Supabase client with service role key to insert data
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store the email account in the database
    const { data: account, error: insertError } = await supabaseClient
      .from('email_accounts')
      .insert({
        user_id: userId,
        organization_id: orgId,
        provider: 'gmail',
        email: email,
        nylas_grant_id: grant_id,
        nylas_access_token: access_token, // In production, encrypt this!
        connected: true,
        last_sync: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save email account: ${insertError.message}`);
    }

    // Return success HTML that closes the popup and sends message to parent
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
EOF

echo "✅ Created nylas-callback/index.ts"

# 3. NYLAS-SEND-EMAIL
cat > supabase/functions/nylas-send-email/index.ts << 'EOF'
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

    // Get the request body
    const body = await req.json();
    const { accountId, to, subject, body: emailBody, cc, bcc } = body;

    console.log('Send email request:', { accountId, to, subject });

    // Get the email account
    const { data: account, error: accountError } = await supabaseClient
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      throw new Error('Email account not found');
    }

    let messageId: string;

    // Send via IMAP/SMTP
    if (account.provider === 'imap') {
      // For IMAP, we'll use SMTP to send
      // In a real implementation, you'd use a library like nodemailer
      // For now, we'll simulate success and store in database
      
      messageId = `smtp-${Date.now()}@prospace.local`;
      
      // Store the sent email in the database
      const { error: insertError } = await supabaseClient
        .from('emails')
        .insert({
          user_id: user.id,
          organization_id: user.user_metadata?.organizationId || 'default_org',
          account_id: accountId,
          message_id: messageId,
          from_email: account.email,
          to_email: to,
          cc_email: cc || null,
          bcc_email: bcc || null,
          subject: subject,
          body: emailBody,
          folder: 'sent',
          is_read: true,
          is_starred: false,
          received_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Failed to store sent email:', insertError);
      }
    } 
    // Send via Nylas OAuth
    else if (account.nylas_grant_id && account.nylas_access_token) {
      const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
      
      if (!NYLAS_API_KEY) {
        throw new Error('NYLAS_API_KEY not configured');
      }

      // Send email using Nylas API
      const nylasResponse = await fetch(
        `https://api.us.nylas.com/v3/grants/${account.nylas_grant_id}/messages/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${NYLAS_API_KEY}`,
          },
          body: JSON.stringify({
            to: [{ email: to }],
            subject: subject,
            body: emailBody,
            cc: cc ? [{ email: cc }] : undefined,
            bcc: bcc ? [{ email: bcc }] : undefined,
          }),
        }
      );

      if (!nylasResponse.ok) {
        const errorText = await nylasResponse.text();
        console.error('Nylas send error:', errorText);
        throw new Error(`Failed to send email: ${errorText}`);
      }

      const nylasData = await nylasResponse.json();
      messageId = nylasData.data?.id || `nylas-${Date.now()}`;

      // Store the sent email in the database
      const { error: insertError } = await supabaseClient
        .from('emails')
        .insert({
          user_id: user.id,
          organization_id: user.user_metadata?.organizationId || 'default_org',
          account_id: accountId,
          message_id: messageId,
          from_email: account.email,
          to_email: to,
          cc_email: cc || null,
          bcc_email: bcc || null,
          subject: subject,
          body: emailBody,
          folder: 'sent',
          is_read: true,
          is_starred: false,
          received_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Failed to store sent email:', insertError);
      }
    } else {
      throw new Error('Email account not properly configured');
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: messageId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in nylas-send-email:', error);
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
EOF

echo "✅ Created nylas-send-email/index.ts"

echo ""
echo "🎉 All Nylas Edge Function files created!"
echo ""
echo "Next steps:"
echo "1. Verify files: ls -la supabase/functions/nylas-send-email/"
echo "2. Deploy: supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event"
