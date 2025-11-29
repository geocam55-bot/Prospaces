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
