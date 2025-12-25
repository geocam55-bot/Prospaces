import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // Parse returnUrl early in case we need it for error redirects
  let returnUrl: string | null = null;
  
  try {
    const url = new URL(req.url);
    
    // Nylas Hosted Auth sends grant_id directly (no code exchange needed)
    const grant_id = url.searchParams.get('grant_id');
    const email = url.searchParams.get('email');
    const provider = url.searchParams.get('provider');
    const state = url.searchParams.get('state');
    const success = url.searchParams.get('success');
    const error = url.searchParams.get('error');

    // Try to extract returnUrl from state for error handling
    if (state) {
      try {
        const stateData = JSON.parse(state);
        returnUrl = stateData.returnUrl || null;
      } catch (e) {
        // Ignore state parse errors here
      }
    }
    
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
    const { userId, orgId, returnUrl: stateReturnUrl } = stateData;

    // Use returnUrl from state if available
    if (stateReturnUrl) {
      returnUrl = stateReturnUrl;
    }

    console.log('State data:', { userId, orgId, returnUrl });
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

    // Return success HTML that redirects back to app
    const appUrl = returnUrl || 
                   Deno.env.get('SUPABASE_URL')?.replace('/supabase', '') || 
                   req.headers.get('origin') || 
                   'https://your-app-url.com';
    
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Successful</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 2rem;
              text-align: center;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
            }
            .container {
              background: white;
              padding: 3rem;
              border-radius: 1rem;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 400px;
            }
            h1 { color: #10b981; margin-bottom: 1rem; }
            p { color: #666; margin-bottom: 0.5rem; }
            .spinner {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #10b981;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 1.5rem auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Connected Successfully!</h1>
            <p><strong>${account.email}</strong></p>
            <p>Provider: ${account.provider}</p>
            <div class="spinner"></div>
            <p style="font-size: 0.875rem; color: #999;">Closing window...</p>
          </div>
          <script>
            console.log('[Nylas Callback] Success! Account:', ${JSON.stringify({
              id: account.id,
              email: account.email,
              provider: account.provider
            })});
            
            // Try to close if opened as popup
            if (window.opener) {
              console.log('[Nylas Callback] Posting message to opener window');
              window.opener.postMessage({
                type: 'nylas-oauth-success',
                account: {
                  id: '${account.id}',
                  email: '${account.email}',
                  provider: '${account.provider}',
                  last_sync: '${account.last_sync}'
                }
              }, '*');
              
              // Close after a short delay to ensure message is sent
              setTimeout(() => {
                console.log('[Nylas Callback] Closing popup window');
                window.close();
              }, 1000);
            } else {
              // Otherwise redirect back to app with success message
              console.log('[Nylas Callback] No opener, redirecting to app');
              setTimeout(() => {
                window.location.href = '${appUrl}?calendar_connected=success&email=${encodeURIComponent(account.email)}';
              }, 1500);
            }
          </script>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('Error in nylas-callback:', error);
    
    // Get app URL for redirect
    const appUrl = returnUrl || 
                   Deno.env.get('SUPABASE_URL')?.replace('/supabase', '') || 
                   req.headers.get('origin') || 
                   'https://your-app-url.com';
    
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
            } else {
              // Redirect back to app with error
              setTimeout(() => {
                window.location.href = '${appUrl}?calendar_connected=error&message=${encodeURIComponent(error.message)}';
              }, 2000);
            }
          </script>
          <div style="font-family: system-ui; padding: 2rem; text-align: center;">
            <h1 style="color: #ef4444;">✗ Connection Failed</h1>
            <p>Error: ${error.message}</p>
            <p>Redirecting back to app...</p>
          </div>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});