# 🚀 Deploy Gmail OAuth - Quick Setup Guide

All the code is ready! Follow these steps to deploy the Gmail OAuth functionality to your Supabase project.

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Logged into Supabase CLI (`supabase login`)
- Google Cloud Console project (for OAuth credentials)

## Step 1: Link Your Supabase Project

```bash
# Link to your existing Supabase project
supabase link --project-ref usorqldwroecyxucmtuw
```

## Step 2: Run Database Migrations

```bash
# Apply the database migrations (creates tables for OAuth)
supabase db push
```

This will create:
- `email_accounts` - Stores connected email accounts
- `email_messages` - Stores synced emails
- `email_attachments` - Stores email attachments
- `oauth_secrets` - Stores OAuth client credentials (secure)
- `oauth_states` - CSRF protection for OAuth flow

## Step 3: Deploy Edge Functions

```bash
# Deploy all three Gmail OAuth Edge Functions
supabase functions deploy gmail-oauth-init
supabase functions deploy gmail-oauth-callback
supabase functions deploy gmail-sync
```

## Step 4: Set Up Google OAuth Credentials

### 4.1: Create OAuth Client in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Web application**
6. Add authorized redirect URI:
   ```
   https://usorqldwroecyxucmtuw.supabase.co/functions/v1/gmail-oauth-callback
   ```
7. Save and note your **Client ID** and **Client Secret**

### 4.2: Enable Gmail API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Enable**

### 4.3: Store OAuth Credentials in Supabase

Run this SQL in your Supabase SQL Editor:

```sql
INSERT INTO oauth_secrets (provider, client_id, client_secret)
VALUES (
  'gmail',
  'YOUR_GOOGLE_CLIENT_ID',
  'YOUR_GOOGLE_CLIENT_SECRET'
);
```

Replace `YOUR_GOOGLE_CLIENT_ID` and `YOUR_GOOGLE_CLIENT_SECRET` with the values from step 4.1.

## Step 5: Test the Integration

1. In your ProSpaces CRM app, go to **Email** module
2. Click **Connect Email Account**
3. Select **OAuth** tab
4. Choose **Gmail**
5. Click **Connect with Gmail**
6. Complete the Google authentication flow

✅ **Done!** Your Gmail account should now be connected.

## Troubleshooting

### Error: "OAuth is not configured"
- Make sure you ran the SQL to insert OAuth credentials in Step 4.3
- Verify the Edge Functions are deployed: `supabase functions list`

### Error: "Failed to initialize OAuth"
- Check Edge Function logs: `supabase functions logs gmail-oauth-init`
- Ensure CORS is configured correctly in the Edge Functions

### OAuth popup is blocked
- Allow popups for your app in browser settings
- Try using a different browser

### "Invalid redirect URI" error
- Make sure the redirect URI in Google Cloud Console exactly matches:
  `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/gmail-oauth-callback`

## Environment Variables (Optional)

If you need to customize the redirect URI, set this environment variable:

```bash
supabase secrets set GMAIL_REDIRECT_URI=https://your-custom-domain.com/oauth/callback
```

## Next Steps

Once OAuth is working:
- The gmail-sync Edge Function can be called to sync emails
- Set up a cron job to automatically sync emails periodically
- Enable SMTP sending through Gmail API

## Alternative: Use IMAP/SMTP

If you don't need OAuth, you can use IMAP/SMTP which works immediately without any backend setup:
1. Select **IMAP/SMTP** tab in the setup dialog
2. Use your email and an app-specific password
3. Works with Gmail, Outlook, and any email provider

---

Need help? Check the Supabase docs or the OAUTH_SETUP_GUIDE.md for more details.
