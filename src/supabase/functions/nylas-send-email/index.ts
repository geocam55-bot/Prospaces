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
    const { accountId, to, subject, body: emailBody, html: emailHtml, cc, bcc } = body;

    // Prefer html field over body field for HTML content
    const finalEmailBody = emailHtml || emailBody;

    // Validate required fields
    if (!accountId || !to || !subject || !finalEmailBody) {
      throw new Error('Missing required fields: accountId, to, subject, body');
    }

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

    console.log('Retrieved account:', {
      id: account.id,
      email: account.email,
      provider: account.provider,
      hasNylasGrantId: !!account.nylas_grant_id,
    });

    // Check if this is a Nylas OAuth account
    if (!account.nylas_grant_id) {
      throw new Error('This account does not support OAuth sending. Use IMAP/SMTP instead or reconnect with OAuth.');
    }

    const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
    
    if (!NYLAS_API_KEY) {
      throw new Error('NYLAS_API_KEY not configured');
    }

    console.log('Sending via Nylas for account:', account.email, 'grant_id:', account.nylas_grant_id);

    // Prepare the email payload for Nylas Send API v3
    // Nylas v3 API format: https://developer.nylas.com/docs/api/v3/eml/#post-/v3/grants/-grant_id-/messages/send
    // For HTML emails, we need to detect if content is HTML and set content_type accordingly
    const isHtml = finalEmailBody.includes('<html>') || finalEmailBody.includes('<!DOCTYPE');
    
    console.log(`🔍 HTML Detection - isHtml: ${isHtml}, body starts with: "${finalEmailBody.substring(0, 100)}"`);
    
    const nylasPayload: any = {
      to: Array.isArray(to) ? to.map((email: string) => ({ email })) : [{ email: to }],
      subject: subject,
      body: finalEmailBody,
    };

    // Explicitly set content type for HTML emails
    if (isHtml) {
      nylasPayload.content_type = 'text/html';
      console.log('✅ Setting content_type to text/html');
    } else {
      console.log('⚠️ No HTML detected, sending as plain text');
    }

    // Add optional fields
    if (cc) {
      nylasPayload.cc = Array.isArray(cc) ? cc.map((email: string) => ({ email })) : [{ email: cc }];
    }
    if (bcc) {
      nylasPayload.bcc = Array.isArray(bcc) ? bcc.map((email: string) => ({ email })) : [{ email: bcc }];
    }

    console.log('Nylas send payload (content_type):', nylasPayload.content_type);

    // Send email using Nylas Send API
    const nylasResponse = await fetch(
      `https://api.us.nylas.com/v3/grants/${account.nylas_grant_id}/messages/send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NYLAS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nylasPayload),
      }
    );

    if (!nylasResponse.ok) {
      const errorText = await nylasResponse.text();
      console.error('Nylas send error:', errorText);
      throw new Error(`Failed to send email via Nylas: ${errorText}`);
    }

    const nylasData = await nylasResponse.json();
    console.log('Nylas send response:', nylasData);

    // Get organization_id from the user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile?.organization_id) {
      console.error('Failed to get user profile for organization_id:', profileError);
      throw new Error('Could not determine organization for email');
    }

    // Store the sent email in the database
    const { error: insertError } = await supabaseClient.from('emails').insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      account_id: accountId,
      message_id: nylasData.data?.id || crypto.randomUUID(),
      from_email: account.email,
      to_email: Array.isArray(to) ? to[0] : to,
      cc_email: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : null,
      bcc_email: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : null,
      subject: subject,
      body: finalEmailBody,
      folder: 'sent',
      is_read: true,
      is_starred: false,
      received_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Failed to store sent email:', insertError);
      // Don't fail the whole request if storage fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: nylasData.data?.id,
        message: 'Email sent successfully',
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