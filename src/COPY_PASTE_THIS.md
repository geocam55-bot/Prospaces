# ⚡ SIMPLE FIX - Copy/Paste Each Block

The files exist in Figma Make but not in Codespaces. Here's the simplest solution:

**Copy and paste each block below, one at a time, into your Codespaces terminal.**

---

## ✅ Step 1: Navigate to Project

```bash
cd /workspaces/ProSpaces
```

---

## ✅ Step 2: Create nylas-send-email (Test One First)

```bash
cat > supabase/functions/nylas-send-email/index.ts << 'ENDOFFILE'
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
    const { accountId, to, subject, body: emailBody, cc, bcc } = body;

    console.log('Send email request:', { accountId, to, subject });

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

    if (account.provider === 'imap') {
      messageId = `smtp-${Date.now()}@prospace.local`;
      
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
    else if (account.nylas_grant_id && account.nylas_access_token) {
      const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
      
      if (!NYLAS_API_KEY) {
        throw new Error('NYLAS_API_KEY not configured');
      }

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
ENDOFFILE
```

**Verify it worked:**
```bash
cat supabase/functions/nylas-send-email/index.ts | head -10
```

You should see TypeScript code! ✅

---

## ✅ Step 3: Test Deploy Just ONE Function

Before creating all 7, let's test deploy this one:

```bash
supabase functions deploy nylas-send-email
```

**If this works**, we'll create the other 6!

**If it fails**, tell me the error and I'll help debug.

---

## 🎯 QUICK START

1. Copy the **Step 1** command → paste in Codespaces → press Enter
2. Copy the **entire Step 2** block → paste in Codespaces → press Enter
3. Copy the **verification** command → paste → check output
4. Copy the **Step 3** command → paste → test deploy

**Tell me if the deploy succeeds or fails!**

If it succeeds, I'll give you the remaining 6 functions in easy copy-paste blocks! 🚀
