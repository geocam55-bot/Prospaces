import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    
    // Nylas Hosted Auth sends grant_id directly (no code exchange needed)
    const grant_id = url.searchParams.get('grant_id');
    const email = url.searchParams.get('email');
    const provider = url.searchParams.get('provider');
    const state = url.searchParams.get('state');
    const success = url.searchParams.get('success');
    const error = url.searchParams.get('error');

    // Log ALL parameters to debug
    const allParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      allParams[key] = value;
    });

    console.log('Callback received:', {
      hasGrantId: !!grant_id,
      hasEmail: !!email,
      hasState: !!state,
      hasError: !!error,
      success,
      url: req.url,
      allParams
    });

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error from provider:', error);
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

    // Check for required parameters
    if (!grant_id || !state || !email) {
      throw new Error(`Missing required parameters. grant_id: ${!!grant_id}, state: ${!!state}, email: ${!!email}`);
    }

    // Parse state to get user info
    const stateData = JSON.parse(state);
    const { userId, orgId } = stateData;

    console.log('State data:', { userId, orgId });
    console.log('Grant details:', { grant_id, email, provider });

    // Nylas Hosted Auth already completed the OAuth flow
    // We have the grant_id, email, and provider directly
    console.log('Using Nylas Hosted Auth grant - no token exchange needed');

    // Map Nylas provider names to our database values
    const dbProvider = provider === 'google' ? 'gmail' : 
                      provider === 'microsoft' ? 'outlook' : 
                      provider || 'gmail';

    console.log('Mapped provider:', { nylasProvider: provider, dbProvider });

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
        provider: dbProvider,
        email: email,
        nylas_grant_id: grant_id,
        nylas_access_token: null, // Hosted auth uses grant_id directly
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