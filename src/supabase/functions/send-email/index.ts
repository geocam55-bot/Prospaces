// Send Email via SMTP
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get request body
    const { accountId, to, subject, body, cc, bcc } = await req.json()

    if (!accountId || !to || !subject || !body) {
      throw new Error('Missing required fields: accountId, to, subject, body')
    }

    // Get email account configuration
    const { data: account, error: accountError } = await supabaseClient
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    if (accountError || !account) {
      throw new Error('Email account not found')
    }

    if (!account.imap_host || !account.imap_username || !account.imap_password) {
      throw new Error('Email account not configured for SMTP')
    }

    // Determine SMTP port (usually IMAP port + 1 or use common SMTP ports)
    const smtpPort = account.imap_port === 993 ? 465 : (account.imap_port === 143 ? 587 : 587)
    
    // Determine SMTP host (usually same as IMAP host but with smtp prefix)
    let smtpHost = account.imap_host
    if (smtpHost.startsWith('imap.')) {
      smtpHost = smtpHost.replace('imap.', 'smtp.')
    }

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: {
          username: account.imap_username,
          password: account.imap_password,
        },
      },
    })

    // Send email
    await client.send({
      from: account.email,
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      subject: subject,
      content: body,
      html: body, // Assuming HTML content
    })

    await client.close()

    // Get user's organization
    const { data: userOrg } = await supabaseClient
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!userOrg) {
      throw new Error('User organization not found')
    }

    // Store sent email in database
    const { data: sentEmail, error: emailError } = await supabaseClient
      .from('email_messages')
      .insert({
        account_id: accountId,
        organization_id: userOrg.organization_id,
        message_id: `sent_${Date.now()}_${crypto.randomUUID()}`,
        subject: subject,
        from_address: account.email,
        to_addresses: Array.isArray(to) ? to : [to],
        cc_addresses: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
        bcc_addresses: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [],
        body_html: body,
        body_text: body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        folder: 'sent',
        is_read: true,
        received_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (emailError) {
      console.error('Error storing sent email:', emailError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        email: sentEmail,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Send email error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
