# 🚀 Deploy Nylas Email Integration

This guide will help you set up **real email sending and receiving** using Nylas - a third-party email API that handles all the complexity of Gmail, Outlook, IMAP, and more.

## Why Nylas?

- ✅ **Unified API** for Gmail, Outlook, IMAP/SMTP, and more
- ✅ **Both sending AND receiving** emails
- ✅ **Handles OAuth complexity** for you
- ✅ **Free tier available** (up to 100 accounts)
- ✅ **Production-ready** and reliable

## Step 1: Create Nylas Account

1. Go to [https://www.nylas.com](https://www.nylas.com)
2. Click **Sign Up** (it's free to start)
3. Create an account and verify your email
4. Complete the onboarding process

## Step 2: Get Your Nylas API Key

1. Log into your Nylas dashboard
2. Go to **App Settings** or **API Keys**
3. Copy your **API Key** (starts with `nylas_...`)
4. Keep this safe - you'll need it in Step 5

## Step 3: Configure OAuth Providers (Optional)

If you want to support Gmail/Outlook OAuth (recommended):

### For Gmail:
1. In Nylas dashboard, go to **Integrations** → **Google**
2. Click **Configure**
3. Follow the instructions to set up Google OAuth
4. Add redirect URI: `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback`

### For Outlook:
1. In Nylas dashboard, go to **Integrations** → **Microsoft**
2. Click **Configure**
3. Follow the instructions to set up Microsoft OAuth
4. Add redirect URI: `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback`

### For IMAP/SMTP:
No configuration needed! Users can connect using their email and password.

## Step 4: Link Your Supabase Project

```bash
# If you haven't already
supabase link --project-ref usorqldwroecyxucmtuw
```

## Step 5: Set Nylas API Key as Secret

```bash
# Set your Nylas API key as a Supabase secret
supabase secrets set NYLAS_API_KEY=your_nylas_api_key_here
```

Replace `your_nylas_api_key_here` with the API key from Step 2.

## Step 6: Run Database Migrations

```bash
# Apply the email database migrations (if not already done)
supabase db push
```

This creates the necessary tables for email storage.

## Step 7: Deploy Edge Functions

```bash
# Deploy all Nylas Edge Functions
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
```

## Step 8: Update Frontend (I'll do this next)

The frontend needs to be updated to:
- Call Nylas functions for connecting accounts
- Send emails via Nylas
- Sync emails via Nylas

## Step 9: Test It Out!

1. In your ProSpaces CRM, go to **Email** module
2. Click **Add Account**
3. Choose your provider (Gmail, Outlook, or IMAP)
4. Complete the connection flow
5. Try sending an email
6. Click **Sync** to receive emails

## What Each Function Does

- **nylas-connect**: Initiates email account connection (OAuth or IMAP)
- **nylas-callback**: Handles OAuth callback and stores account
- **nylas-send-email**: Sends real emails through Nylas
- **nylas-sync-emails**: Fetches and stores emails from Nylas

## Pricing

Nylas offers:
- **Free tier**: Up to 100 connected accounts
- **Paid plans**: Start at $12/month for more accounts

For most small businesses, the free tier is plenty!

## Troubleshooting

### "Nylas API key not configured"
- Make sure you ran: `supabase secrets set NYLAS_API_KEY=your_key`
- Verify with: `supabase secrets list`

### OAuth redirect issues
- Ensure redirect URI is exactly: `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback`
- Check Nylas dashboard → Integrations → Google/Microsoft

### Emails not syncing
- Check Edge Function logs: `supabase functions logs nylas-sync-emails`
- Verify account is connected in Nylas dashboard
- Make sure migrations were run: `supabase db push`

## Next Steps

Once deployed, you'll have:
- ✅ Real email sending
- ✅ Real email receiving/syncing
- ✅ Support for Gmail, Outlook, and IMAP
- ✅ Automatic handling of OAuth tokens
- ✅ Webhooks for real-time email notifications (can be added later)

---

**Ready to deploy? Run the commands in Steps 4-7!**
