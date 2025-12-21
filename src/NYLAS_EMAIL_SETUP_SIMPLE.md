# Nylas Email Integration - Simplified Setup (Using Nylas Connectors)

## Overview

This is the **simplified setup** that uses Nylas's pre-configured OAuth connectors. No need to create Azure or Google Cloud apps!

**✅ Recommended for**: Quick setup, testing, MVP deployments  
**⚠️ Limitations**: Shared rate limits, Nylas branding during OAuth

For custom branding and dedicated rate limits, see `/NYLAS_EMAIL_SETUP.md` (advanced setup).

---

## What You Need

- ✅ Nylas account (free tier available)
- ✅ Supabase project 
- ✅ 10 minutes

**That's it!** No Azure or Google Cloud setup required.

---

## Step 1: Create Nylas Application

### 1.1: Sign Up for Nylas

1. Go to https://dashboard.nylas.com/
2. Create a free account
3. Verify your email

### 1.2: Create Application

1. Click **"Create Application"**
2. **Name**: `ProSpaces CRM`
3. **API Version**: Select **v3** (latest)
4. Click **"Create"**

### 1.3: Get Your API Credentials

1. In your application, go to **"App Settings"** → **"API Keys"**

2. **Copy these two values**:
   ```
   API Key:    nylas_v3_xxx... (starts with "nylas_v3_")
   Client ID:  abc123... (alphanumeric string)
   ```

3. **Save them** - you'll add to Supabase in Step 3

---

## Step 2: Enable Nylas Built-in Connectors

### 2.1: Enable Microsoft Connector

1. In Nylas Dashboard, go to **"Connectors"**

2. Find **"Microsoft"** in the list

3. **Toggle it ON** ✅

   That's it! Nylas's Microsoft connector is now enabled. It uses Nylas's pre-configured Azure OAuth app.

### 2.2: Enable Google Connector (Optional)

1. Find **"Google"** in the connectors list

2. **Toggle it ON** ✅

   Done! Gmail integration is now enabled.

### 2.3: Other Providers (Optional)

Nylas also provides built-in connectors for:
- **IMAP** (any email provider)
- **Yahoo**
- **iCloud**
- **Zoom** (for calendar)

Toggle on any you want to support.

---

## Step 3: Configure Callback URI

### 3.1: Get Your Supabase Project Reference

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your ProSpaces CRM project
3. Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
4. Copy the **`YOUR_PROJECT_REF`** part (e.g., `abcdefghijklmnop`)

### 3.2: Add Callback URI to Nylas

1. **In Nylas Dashboard**, go to **"App Settings"** → **"Callback URIs"**

2. **Click "Add URI"**

3. **Enter**:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-callback
   ```
   
   Replace `YOUR_PROJECT_REF` with your actual project reference from Step 3.1

4. **Click "Save"**

**Example**:
```
https://abcdefghijklmnop.supabase.co/functions/v1/nylas-callback
```

---

## Step 4: Configure Supabase Secrets

### 4.1: Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your ProSpaces CRM project
3. Click **"Project Settings"** (gear icon in bottom left)
4. Navigate to **"Edge Functions"** section
5. Click **"Manage secrets"** button

### 4.2: Add Nylas Credentials

Click **"Add new secret"** for each of these:

#### Secret 1: Nylas API Key
```
Name:  NYLAS_API_KEY
Value: nylas_v3_xxx... (from Nylas Dashboard - Step 1.3)
```

#### Secret 2: Nylas Client ID
```
Name:  NYLAS_CLIENT_ID  
Value: abc123... (from Nylas Dashboard - Step 1.3)
```

#### Secret 3: Your Supabase URL
```
Name:  SUPABASE_URL
Value: https://YOUR_PROJECT_REF.supabase.co
```

#### Secret 4: Your Supabase Anon Key
```
Name:  SUPABASE_ANON_KEY
Value: eyJxxx... (from Project Settings → API → anon/public key)
```

#### Secret 5: Callback Redirect URI
```
Name:  CALENDAR_REDIRECT_URI
Value: https://pro-spaces.vercel.app/auth/callback
```

**⚠️ Important**: After adding secrets, they take effect immediately. No restart needed.

---

## Step 5: Verify Edge Functions Are Deployed

### 5.1: Check Deployed Functions

1. In Supabase Dashboard, click **"Edge Functions"** in left sidebar

2. You should see these functions listed:
   - ✅ `nylas-connect`
   - ✅ `nylas-callback`
   - ✅ `calendar-oauth-init`
   - ✅ `calendar-oauth-callback`

3. Each should show a green **"Deployed"** status

### 5.2: If Functions Are NOT Deployed

**Option A: Deploy via Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy calendar-oauth-init
supabase functions deploy calendar-oauth-callback
```

**Option B: Deploy via GitHub Actions**

If you have GitHub Actions set up, push your code and they'll deploy automatically.

---

## Step 6: Test Email Integration

### 6.1: Open ProSpaces CRM

1. Go to https://pro-spaces.vercel.app
2. Sign in to your account
3. Navigate to **Settings** (click profile icon → Settings)

### 6.2: Connect Microsoft Outlook

1. Go to **"Email & Calendar"** tab
2. Click **"Connect Outlook"** button
3. You'll be redirected to Microsoft login page
4. **Sign in** with your Microsoft/Outlook account
5. **Grant permissions** when prompted:
   - Read and write your email
   - Read and write your calendar
   - Access your profile
6. You'll be redirected back to ProSpaces CRM
7. You should see your email in **"Connected Accounts"** with ✅ green status

### 6.3: Connect Gmail (Optional)

1. Click **"Connect Gmail"** button
2. Sign in with your Google account
3. Grant permissions
4. Verify connection status shows green ✅

### 6.4: Test Email Sync

1. Navigate to **"Email"** module in main navigation
2. You should see your recent emails loading
3. Try:
   - ✅ Viewing an email thread
   - ✅ Sending a new email
   - ✅ Replying to an email
   - ✅ Searching emails

---

## Troubleshooting

### ❌ Error: "OAuth configuration missing"

**Cause**: Supabase secrets not set correctly

**Fix**:
1. Go to Supabase Dashboard → Project Settings → Edge Functions
2. Click "Manage secrets"
3. Verify both `NYLAS_API_KEY` and `NYLAS_CLIENT_ID` are listed
4. If not, add them again (Step 4)

---

### ❌ Error: "Invalid redirect URI"

**Cause**: Callback URI mismatch between Nylas and Supabase

**Fix**:
1. Get your exact Supabase project URL:
   - Supabase Dashboard → Project Settings → API → Project URL
   - Should be: `https://YOUR_PROJECT_REF.supabase.co`

2. In Nylas Dashboard → Callback URIs, verify:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-callback
   ```

3. Must match EXACTLY (including `https://`, no trailing slash)

---

### ❌ Error: "Failed to connect account"

**Cause**: Edge function not deployed or crashed

**Fix**:
1. Check Edge Function logs:
   - Supabase Dashboard → Edge Functions → `nylas-callback` → Logs
2. Look for error messages
3. Common issues:
   - Missing secrets (add them in Step 4)
   - Wrong callback URI (fix in Step 3)
   - Nylas API quota exceeded (upgrade Nylas plan)

---

### ❌ Emails not syncing

**Cause**: Grant expired or insufficient permissions

**Fix**:
1. Disconnect and reconnect your email account:
   - Settings → Email & Calendar
   - Click "Disconnect" next to your account
   - Click "Connect Outlook" or "Connect Gmail" again
   - Re-authorize with full permissions

2. Check Nylas Dashboard:
   - Go to **"Grants"** section
   - Find your email account
   - Status should be **"Active"** (green)
   - If "Expired" or "Invalid", user needs to re-authorize

---

### ❌ "Rate limit exceeded"

**Cause**: Nylas free tier limits reached

**Fix**:
1. Check your Nylas plan limits:
   - Nylas Dashboard → Billing
   - Free tier: 5 connected accounts, 100 API calls/day

2. Options:
   - Upgrade to paid Nylas plan ($29/month for 25 accounts)
   - Use custom Azure/Google apps (see `/NYLAS_EMAIL_SETUP.md`) for higher limits
   - Implement request caching to reduce API calls

---

## Complete Setup Checklist

Use this checklist to verify everything is configured:

- [ ] Nylas account created and email verified
- [ ] Nylas application created (name: ProSpaces CRM)
- [ ] API Key and Client ID copied from Nylas Dashboard
- [ ] Microsoft connector enabled in Nylas (toggle ON)
- [ ] Google connector enabled in Nylas (optional, toggle ON)
- [ ] Callback URI added to Nylas: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-callback`
- [ ] Supabase secret `NYLAS_API_KEY` added
- [ ] Supabase secret `NYLAS_CLIENT_ID` added
- [ ] Supabase secret `SUPABASE_URL` added
- [ ] Supabase secret `SUPABASE_ANON_KEY` added
- [ ] Supabase secret `CALENDAR_REDIRECT_URI` added
- [ ] Edge functions deployed (4 functions showing "Deployed" status)
- [ ] Can access https://pro-spaces.vercel.app without errors
- [ ] Successfully connected test Outlook account
- [ ] Emails syncing and displaying in Email module
- [ ] Can send test email successfully

---

## Comparison: Simple vs Advanced Setup

| Feature | **Simple Setup** (This Guide) | **Advanced Setup** (`/NYLAS_EMAIL_SETUP.md`) |
|---------|-------------------------------|----------------------------------------------|
| **Setup Time** | 10 minutes | 1-2 hours |
| **Azure App Required** | ❌ No | ✅ Yes |
| **Google Cloud Required** | ❌ No | ✅ Yes (for Gmail) |
| **OAuth Branding** | Shows "Nylas" | Shows "ProSpaces CRM" |
| **Rate Limits** | Shared across Nylas users | Dedicated to your app |
| **API Quotas** | Nylas plan limits | Azure/Google quotas |
| **Cost** | Nylas plan only | Nylas + Azure AD (usually free) |
| **Best For** | MVP, testing, small teams | Production, large teams, enterprise |
| **Email Providers** | Outlook, Gmail, Yahoo, iCloud | Outlook, Gmail (custom apps) |

**Recommendation**: Start with Simple Setup. Upgrade to Advanced Setup when you need:
- Custom branding during OAuth flow
- Higher rate limits (>100 accounts)
- White-label experience
- Enterprise compliance requirements

---

## What's Next?

After email integration is working:

1. **Test with Real Users**
   - Invite team members to connect their email accounts
   - Monitor Nylas Dashboard → Grants for connection status

2. **Set Up Webhooks** (for real-time email sync)
   - Nylas Dashboard → Webhooks
   - Add webhook URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-webhook`
   - Enable events: `message.created`, `message.updated`

3. **Configure Email Rules**
   - Auto-sync emails every 15 minutes
   - Filter out spam/promotions
   - Auto-link emails to CRM contacts

4. **Monitor Usage**
   - Track Nylas API calls in Dashboard → Analytics
   - Set up alerts for quota limits
   - Upgrade plan if needed

5. **Add Calendar Integration**
   - Test calendar sync (uses same Nylas connectors)
   - Book appointments from CRM
   - Show availability in scheduling

---

## Support

- **Nylas Documentation**: https://developer.nylas.com/docs/
- **Nylas Support**: support@nylas.com
- **Supabase Docs**: https://supabase.com/docs
- **ProSpaces CRM Issues**: Check your GitHub repository

---

## Environment Variables Quick Reference

### Supabase Edge Functions Secrets

Copy these exact secret names:

```bash
NYLAS_API_KEY=nylas_v3_xxx...
NYLAS_CLIENT_ID=abc123...
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
CALENDAR_REDIRECT_URI=https://pro-spaces.vercel.app/auth/callback
```

### Vercel Environment Variables

These should already be set in your Vercel project:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

---

**Last Updated**: December 21, 2025  
**Version**: 1.0.0 - Simplified Setup  
**Estimated Setup Time**: 10 minutes
