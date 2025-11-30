# Gmail OAuth Setup Guide for ProSpaces CRM

This guide will walk you through setting up Gmail OAuth integration with Supabase Edge Functions.

## Prerequisites

- Supabase project with the database migrations applied
- Google Cloud Platform account
- Supabase CLI installed (`npm install -g supabase`)

---

## Step 1: Google Cloud Console Setup

### 1.1 Create/Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Name it "ProSpaces CRM" or similar

### 1.2 Enable Gmail API

1. In the Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on it and press **Enable**

### 1.3 Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (or Internal if using Google Workspace)
3. Fill in the application information:
   - **App name:** ProSpaces CRM
   - **User support email:** Your email
   - **Developer contact email:** Your email
4. Click **Save and Continue**
5. Add scopes:
   - Click **Add or Remove Scopes**
   - Add these scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Click **Update**
6. Click **Save and Continue**
7. Add test users (your email addresses) if app is not published
8. Click **Save and Continue**

### 1.4 Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Configure:
   - **Name:** ProSpaces CRM Web Client
   - **Authorized JavaScript origins:**
     - `http://localhost:54321` (local development)
     - `https://your-project.supabase.co` (production)
   - **Authorized redirect URIs:**
     - `http://localhost:54321/functions/v1/gmail-oauth-callback` (local)
     - `https://your-project.supabase.co/functions/v1/gmail-oauth-callback` (production)
5. Click **Create**
6. **Copy the Client ID and Client Secret** - you'll need these!

---

## Step 2: Supabase Setup

### 2.1 Run Database Migrations

```bash
# Navigate to your project directory
cd /path/to/prospaces-crm

# Make sure you're logged in to Supabase
supabase login

# Link your project (first time only)
supabase link --project-ref your-project-ref

# Push migrations to Supabase
supabase db push
```

### 2.2 Store OAuth Credentials

1. Go to your Supabase Dashboard
2. Open **SQL Editor**
3. Run this query to store your Gmail OAuth credentials:

```sql
INSERT INTO oauth_secrets (provider, client_id, client_secret)
VALUES (
  'gmail',
  'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  'YOUR_GOOGLE_CLIENT_SECRET'
)
ON CONFLICT (provider) 
DO UPDATE SET 
  client_id = EXCLUDED.client_id,
  client_secret = EXCLUDED.client_secret;
```

**Important:** Replace `YOUR_GOOGLE_CLIENT_ID` and `YOUR_GOOGLE_CLIENT_SECRET` with the values from Step 1.4.

### 2.3 Deploy Edge Functions

```bash
# Deploy all email-related functions
supabase functions deploy gmail-oauth-init
supabase functions deploy gmail-oauth-callback
supabase functions deploy gmail-sync

# Verify deployment
supabase functions list
```

### 2.4 Set Environment Variables (Optional)

If you want to customize the redirect URI:

```bash
supabase secrets set GMAIL_REDIRECT_URI=https://your-custom-domain.com/api/auth/gmail/callback
```

---

## Step 3: Frontend Integration

The frontend code has been updated to support OAuth. Key changes:

1. **EmailAccountSetup component** now has a working OAuth flow
2. When users click "Connect" for Gmail, it:
   - Calls the `gmail-oauth-init` Edge Function
   - Opens a popup with Google's OAuth consent screen
   - Handles the callback automatically
   - Stores the account in Supabase

### Testing OAuth Flow

1. Go to your ProSpaces CRM app
2. Navigate to **Email** module
3. Click **Add Email Account**
4. Click on the **OAuth** tab
5. Click **Connect** for Gmail
6. A popup will open asking you to sign in with Google
7. Grant the requested permissions
8. The popup will close automatically and the account will be connected!

---

## Step 4: Testing & Verification

### 4.1 Test OAuth Flow

1. Try connecting a Gmail account
2. Check Supabase dashboard → **Table Editor** → `email_accounts`
3. Verify the account was created with tokens

### 4.2 Test Email Sync

1. After connecting an account, click the **Sync** button
2. The `gmail-sync` function will fetch your recent emails
3. Check **Table Editor** → `email_messages` to see synced emails

### 4.3 Monitor Edge Function Logs

```bash
# View real-time logs
supabase functions logs gmail-oauth-init
supabase functions logs gmail-oauth-callback
supabase functions logs gmail-sync
```

---

## Step 5: Production Deployment

### 5.1 Verify OAuth App

For production use, you need to verify your OAuth app with Google:

1. Go to Google Cloud Console → **OAuth consent screen**
2. Click **Publish App**
3. Submit for verification (required if you have >100 users)
4. Google will review your app (usually takes 1-2 weeks)

**Until verified, your app can only have 100 test users.**

### 5.2 Update Redirect URIs

Make sure your production redirect URI is added in Google Cloud Console:

```
https://your-project.supabase.co/functions/v1/gmail-oauth-callback
```

### 5.3 Monitor Usage

- Check Google Cloud Console → **APIs & Services** → **Dashboard** for API usage
- Gmail API has quotas: 1 billion quota units per day
- Each sync operation uses quota units

---

## Security Best Practices

✅ **Tokens are encrypted at rest** in Supabase (via RLS policies)
✅ **State parameter** prevents CSRF attacks
✅ **Refresh tokens** are stored for automatic token renewal
✅ **Service role** is required to access secrets
✅ **User isolation** via RLS ensures users only see their own emails

---

## Troubleshooting

### "OAuth not configured" Error

- Make sure you ran the SQL query in Step 2.2
- Verify the `oauth_secrets` table has a row for `gmail`

### "Invalid redirect URI" Error

- Check that your redirect URI exactly matches what's in Google Cloud Console
- Include the protocol (http:// or https://)
- Don't include trailing slashes

### "Token expired" Error

- This is normal - the `gmail-sync` function automatically refreshes tokens
- Make sure the `refresh_token` is stored in the database

### Popup Blocked

- Some browsers block popups by default
- Tell users to allow popups for your domain
- Consider showing instructions if popup fails

### No Emails Syncing

- Check Edge Function logs: `supabase functions logs gmail-sync`
- Verify the access token is valid
- Check Gmail API quotas in Google Cloud Console

---

## Cost Considerations

- **Supabase:** Free tier includes 500MB database, 2GB bandwidth, 500K Edge Function invocations
- **Gmail API:** Free with quotas (1B units/day is very generous)
- **Google Cloud:** Free tier, but verify your app to avoid limits

---

## Next Steps

- ✅ Gmail OAuth is now set up!
- 🔄 Add automatic background sync (cron job via Supabase)
- 📧 Implement email sending via Gmail API
- 📎 Add attachment support
- 🔔 Add real-time push notifications via Gmail webhooks
- 📊 Add email analytics and tracking

---

## Support

If you encounter issues:

1. Check Supabase Edge Function logs
2. Check browser console for frontend errors
3. Verify all environment variables are set
4. Check Google Cloud Console for API errors

Need help? The implementation is complete and ready to use!
