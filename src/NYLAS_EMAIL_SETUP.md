# Nylas Email Integration Setup Guide

## Overview

ProSpaces CRM uses Nylas for unified email and calendar integration. This guide walks you through configuring OAuth credentials for Microsoft Outlook and Google Gmail.

---

## Prerequisites

- Supabase project with Edge Functions enabled
- Nylas account (Sign up at https://dashboard.nylas.com/)
- Microsoft Azure account (for Outlook integration)
- Google Cloud account (for Gmail integration - optional)
- Vercel deployment URL: `https://pro-spaces.vercel.app`

---

## Part 1: Nylas Configuration

### Step 1.1: Create Nylas Application

1. **Sign in to Nylas Dashboard**
   - Go to https://dashboard.nylas.com/
   - Create an account or sign in

2. **Create a New Application**
   - Click **"Create Application"**
   - Name: `ProSpaces CRM`
   - Select **v3 API** (latest version)

### Step 1.2: Get Nylas Credentials

1. **Navigate to App Settings**
   - Click on your application
   - Go to **"App Settings"** → **"API Keys"**

2. **Copy Your Credentials**
   ```
   API Key:    nylas_xxx... (starts with "nylas_")
   Client ID:  your-client-id-here
   ```

3. **Save these values** - you'll add them to Supabase later

### Step 1.3: Configure Nylas Redirect URI

1. **In Nylas Dashboard**, go to **"App Settings"** → **"Callback URIs"**

2. **Add Redirect URI**:
   ```
   https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/nylas-callback
   ```
   
   Replace `YOUR_SUPABASE_PROJECT_REF` with your actual Supabase project reference (found in Supabase dashboard URL)

3. **Click "Save"**

---

## Part 2: Microsoft Azure Setup (Outlook Integration)

### Step 2.1: Create Azure App Registration

1. **Sign in to Azure Portal**
   - Go to https://portal.azure.com/
   - Navigate to **Azure Active Directory**

2. **Create App Registration**
   - Click **"App registrations"** → **"New registration"**
   - Name: `ProSpaces CRM - Nylas`
   - Supported account types: **"Accounts in any organizational directory and personal Microsoft accounts"**
   - Redirect URI: Leave blank for now
   - Click **"Register"**

### Step 2.2: Configure Authentication

1. **Navigate to Authentication**
   - In your app, click **"Authentication"** in left sidebar
   - Click **"Add a platform"** → **"Web"**

2. **Add Redirect URIs**:
   ```
   https://api.us.nylas.com/v3/connect/callback
   https://api.eu.nylas.com/v3/connect/callback
   ```
   
   Add both US and EU endpoints for redundancy

3. **Configure Token Settings**
   - Under **"Implicit grant and hybrid flows"**, check:
     - ✅ **Access tokens**
     - ✅ **ID tokens**
   - Click **"Save"**

### Step 2.3: Create Client Secret

1. **Navigate to Certificates & Secrets**
   - Click **"Certificates & secrets"** in left sidebar
   - Click **"New client secret"**
   - Description: `ProSpaces CRM Nylas Integration`
   - Expires: **24 months** (or your preferred duration)
   - Click **"Add"**

2. **Copy the Secret Value**
   ```
   Client Secret Value: xxx~xxx (copy immediately - won't be shown again!)
   ```

3. **Also copy Application (client) ID**
   - Go back to **"Overview"**
   - Copy **"Application (client) ID"**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### Step 2.4: Configure API Permissions

1. **Navigate to API Permissions**
   - Click **"API permissions"** in left sidebar
   - Click **"Add a permission"** → **"Microsoft Graph"** → **"Delegated permissions"**

2. **Add Required Permissions**:
   - ✅ `Mail.ReadWrite` - Read and write mail
   - ✅ `Mail.Send` - Send mail
   - ✅ `Calendars.ReadWrite` - Read and write calendars
   - ✅ `User.Read` - Sign in and read user profile
   - ✅ `offline_access` - Maintain access to data
   - ✅ `openid` - Sign users in
   - ✅ `profile` - View users' basic profile
   - ✅ `email` - View users' email address

3. **Grant Admin Consent** (if available)
   - Click **"Grant admin consent for [Your Organization]"**
   - This allows all users in your org to use the app without individual consent

---

## Part 3: Google Cloud Setup (Gmail Integration - Optional)

### Step 3.1: Create Google Cloud Project

1. **Sign in to Google Cloud Console**
   - Go to https://console.cloud.google.com/
   - Create a new project: `ProSpaces CRM`

### Step 3.2: Enable APIs

1. **Navigate to APIs & Services**
   - Click **"Enable APIs and Services"**
   - Search and enable:
     - ✅ **Gmail API**
     - ✅ **Google Calendar API**
     - ✅ **People API**

### Step 3.3: Create OAuth Credentials

1. **Configure OAuth Consent Screen**
   - Go to **"OAuth consent screen"**
   - User Type: **External**
   - App name: `ProSpaces CRM`
   - User support email: Your email
   - Developer contact: Your email
   - Click **"Save and Continue"**

2. **Add Scopes**
   - Click **"Add or Remove Scopes"**
   - Add:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`

3. **Create OAuth Client ID**
   - Go to **"Credentials"**
   - Click **"Create Credentials"** → **"OAuth client ID"**
   - Application type: **Web application**
   - Name: `ProSpaces CRM - Nylas`
   - Authorized redirect URIs:
     ```
     https://api.us.nylas.com/v3/connect/callback
     https://api.eu.nylas.com/v3/connect/callback
     ```
   - Click **"Create"**

4. **Copy Your Credentials**
   ```
   Client ID:     xxxxxxx.apps.googleusercontent.com
   Client Secret: GOCSPX-xxxxx
   ```

---

## Part 4: Configure Nylas Connectors

### Step 4.1: Add Microsoft Connector to Nylas

1. **In Nylas Dashboard**, go to **"Connectors"**

2. **Click "Add Connector"** → **"Microsoft"**

3. **Enter Microsoft Credentials**:
   ```
   Client ID:     [Your Azure Application (client) ID]
   Client Secret: [Your Azure Client Secret]
   ```

4. **Configure Scopes** (should be auto-populated):
   - `https://graph.microsoft.com/Mail.ReadWrite`
   - `https://graph.microsoft.com/Mail.Send`
   - `https://graph.microsoft.com/Calendars.ReadWrite`
   - `https://graph.microsoft.com/User.Read`
   - `offline_access`

5. **Click "Save"**

### Step 4.2: Add Google Connector to Nylas (Optional)

1. **Click "Add Connector"** → **"Google"**

2. **Enter Google Credentials**:
   ```
   Client ID:     [Your Google Client ID]
   Client Secret: [Your Google Client Secret]
   ```

3. **Click "Save"**

---

## Part 5: Configure Supabase Edge Functions

### Step 5.1: Add Environment Secrets

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your ProSpaces CRM project

2. **Navigate to Edge Functions**
   - Click **"Edge Functions"** in left sidebar
   - Click **"Manage secrets"** or go to **"Project Settings"** → **"Edge Functions"**

3. **Add Required Secrets**

   Click **"Add new secret"** for each of the following:

   #### Nylas Credentials
   ```
   Name:  NYLAS_API_KEY
   Value: nylas_xxx... (from Nylas Dashboard)
   ```

   ```
   Name:  NYLAS_CLIENT_ID
   Value: your-nylas-client-id (from Nylas Dashboard)
   ```

   #### Microsoft Azure Credentials
   ```
   Name:  MICROSOFT_CLIENT_ID
   Value: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (from Azure App)
   ```

   ```
   Name:  MICROSOFT_CLIENT_SECRET
   Value: xxx~xxx (from Azure App)
   ```

   #### Google Cloud Credentials (Optional)
   ```
   Name:  GOOGLE_CLIENT_ID
   Value: xxxxxxx.apps.googleusercontent.com
   ```

   ```
   Name:  GOOGLE_CLIENT_SECRET
   Value: GOCSPX-xxxxx
   ```

   #### Application URLs
   ```
   Name:  CALENDAR_REDIRECT_URI
   Value: https://pro-spaces.vercel.app/auth/callback
   ```

   ```
   Name:  SUPABASE_URL
   Value: https://YOUR_PROJECT_REF.supabase.co
   ```

   ```
   Name:  SUPABASE_ANON_KEY
   Value: eyJxxx... (from Supabase Project Settings → API)
   ```

### Step 5.2: Deploy Edge Functions

**Option A: Using Supabase CLI**

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link Your Project**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Deploy Edge Functions**:
   ```bash
   # Deploy all functions
   supabase functions deploy nylas-connect
   supabase functions deploy nylas-callback
   supabase functions deploy calendar-oauth-init
   supabase functions deploy calendar-oauth-callback
   ```

**Option B: Using Supabase Dashboard**

1. **Navigate to Edge Functions** in Supabase Dashboard
2. **For each function** (`nylas-connect`, `nylas-callback`, `calendar-oauth-init`, `calendar-oauth-callback`):
   - Click the function name
   - Click **"Deploy new version"**
   - Upload the function code from `/supabase/functions/[function-name]/index.ts`

### Step 5.3: Verify Deployment

1. **Check Function Logs**
   - In Supabase Dashboard, go to **"Edge Functions"**
   - Click on a function → **"Logs"**
   - Verify no errors on startup

2. **Test Function Endpoints**
   ```bash
   # Test nylas-connect endpoint
   curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-connect \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

   You should get a response (not an error)

---

## Part 6: Update Frontend Configuration

### Step 6.1: Verify Environment Variables

Check that your Vercel deployment has these environment variables set:

1. **Go to Vercel Dashboard**
   - Select ProSpaces CRM project
   - Navigate to **"Settings"** → **"Environment Variables"**

2. **Verify Variables**:
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJxxx...
   ```

3. **Redeploy if needed**:
   - Go to **"Deployments"**
   - Click **"..."** on latest deployment → **"Redeploy"**

---

## Part 7: Test Email Integration

### Step 7.1: Test Outlook Connection

1. **Log into ProSpaces CRM**
   - Go to https://pro-spaces.vercel.app
   - Sign in with your account

2. **Navigate to Settings**
   - Click your profile icon → **"Settings"**
   - Go to **"Email & Calendar"** tab

3. **Connect Outlook Account**
   - Click **"Connect Outlook"** button
   - You should be redirected to Microsoft login
   - Sign in with your Microsoft account
   - Grant permissions when prompted
   - You should be redirected back to ProSpaces CRM

4. **Verify Connection**
   - Check that your email appears under **"Connected Accounts"**
   - Status should show **"Connected"** with green indicator

### Step 7.2: Test Gmail Connection (if configured)

1. **Follow same steps as Outlook**
   - Click **"Connect Gmail"** button
   - Sign in with Google account
   - Grant permissions
   - Verify connection status

### Step 7.3: Test Email Sync

1. **Navigate to Email Module**
   - Go to main navigation → **"Email"**

2. **Verify Email Sync**
   - Recent emails should appear in inbox
   - Check that you can:
     - ✅ View email threads
     - ✅ Send new emails
     - ✅ Reply to emails
     - ✅ Search emails

---

## Troubleshooting

### Error: "OAuth configuration missing"

**Solution**: Verify all secrets are added to Supabase Edge Functions
```bash
# Check secrets are set
supabase secrets list
```

### Error: "Invalid redirect URI"

**Solution**: Ensure redirect URIs match exactly in:
- Azure App Registration → Authentication
- Google OAuth Consent → Authorized redirect URIs  
- Nylas Dashboard → Callback URIs

### Error: "Insufficient permissions"

**Solution**: For Microsoft Azure:
1. Go to **API Permissions**
2. Verify all required scopes are added
3. Click **"Grant admin consent"**

### Email sync not working

**Solution**: Check Edge Function logs:
1. Supabase Dashboard → **Edge Functions** → **Logs**
2. Look for errors in `nylas-callback` function
3. Common issues:
   - Invalid API key
   - Token expiration (refresh token flow needed)
   - Network connectivity to Nylas API

### Cannot send emails

**Solution**: Verify Nylas grant has send permissions:
1. Check Nylas Dashboard → **Grants**
2. Click on the grant for your email account
3. Verify `mail.send` scope is included
4. If not, re-authorize the email account

---

## Production Checklist

Before going live, verify:

- [ ] All Supabase secrets are configured
- [ ] Edge Functions are deployed and running
- [ ] Microsoft Azure app is not in "Testing" mode (publish for production)
- [ ] Google OAuth consent screen is verified (if using Gmail)
- [ ] Redirect URIs use production URLs (not localhost)
- [ ] Nylas application is on appropriate pricing tier
- [ ] SSL certificates are valid for all domains
- [ ] Email sync is working for test accounts
- [ ] Error logging is configured for Edge Functions
- [ ] Rate limiting is configured (if needed)
- [ ] User data privacy compliance is verified

---

## Security Best Practices

1. **Never commit secrets to Git**
   - All API keys and secrets should only be in Supabase/Vercel environment variables
   - Add `.env` files to `.gitignore`

2. **Rotate secrets regularly**
   - Microsoft client secrets every 12-24 months
   - Nylas API keys if compromised
   - Supabase keys on security audits

3. **Use least-privilege permissions**
   - Only request OAuth scopes you actually need
   - Remove unused API permissions

4. **Monitor access logs**
   - Review Nylas Dashboard → Analytics
   - Check Supabase Edge Function logs weekly
   - Set up alerts for unusual activity

5. **Implement token refresh**
   - Edge Functions handle this automatically
   - Monitor for expired grants in Nylas Dashboard

---

## Support Resources

- **Nylas Documentation**: https://developer.nylas.com/docs/
- **Microsoft Graph API**: https://learn.microsoft.com/en-us/graph/
- **Google Gmail API**: https://developers.google.com/gmail/api
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions

---

## Appendix: Complete Environment Variables Reference

### Supabase Edge Functions Secrets

| Secret Name | Source | Required For | Example Value |
|-------------|--------|--------------|---------------|
| `NYLAS_API_KEY` | Nylas Dashboard → API Keys | All email functions | `nylas_xxx...` |
| `NYLAS_CLIENT_ID` | Nylas Dashboard → API Keys | OAuth flow | `abc123...` |
| `MICROSOFT_CLIENT_ID` | Azure App → Overview | Outlook integration | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `MICROSOFT_CLIENT_SECRET` | Azure App → Certificates & Secrets | Outlook integration | `xxx~xxx...` |
| `GOOGLE_CLIENT_ID` | Google Cloud → Credentials | Gmail integration | `xxxxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google Cloud → Credentials | Gmail integration | `GOCSPX-xxxxx` |
| `CALENDAR_REDIRECT_URI` | Your app | Callback URL | `https://pro-spaces.vercel.app/auth/callback` |
| `SUPABASE_URL` | Supabase Dashboard → Settings → API | Database access | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Database access | `eyJxxx...` |

### Vercel Environment Variables

| Variable Name | Value | Production | Preview |
|---------------|-------|------------|---------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | ✅ | ✅ |
| `VITE_SUPABASE_ANON_KEY` | `eyJxxx...` | ✅ | ✅ |

---

**Last Updated**: December 21, 2025  
**Version**: 1.0.0  
**Maintained by**: ProSpaces CRM Team
