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
