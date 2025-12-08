# Calendar OAuth Setup Guide

This guide walks you through setting up OAuth authentication for Google Calendar and Outlook Calendar integration in ProSpaces CRM.

## Prerequisites

- Supabase project set up
- Calendar sync migration applied (`20231113000000_calendar_sync.sql`)
- Access to Google Cloud Console and/or Microsoft Azure Portal

---

## 🔵 Google Calendar OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to **APIs & Services** → **Library**
   - Search for "Google Calendar API"
   - Click **Enable**

### Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (or Internal if using Google Workspace)
3. Fill in the application information:
   - **App name**: ProSpaces CRM
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar` (Full calendar access)
   - `https://www.googleapis.com/auth/calendar.events` (Manage events)
   - `https://www.googleapis.com/auth/userinfo.email` (User email)
5. Add test users (if in testing mode)
6. Save and continue

### Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `ProSpaces CRM Calendar`
5. **Authorized redirect URIs**:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
   http://localhost:5173/auth/callback (for local development)
   ```
6. Click **Create**
7. **Save the Client ID and Client Secret** - you'll need these!

### Step 4: Store Credentials in Supabase

Run this SQL in your Supabase SQL Editor:

```sql
UPDATE oauth_secrets 
SET 
  client_id = 'YOUR_GOOGLE_CLIENT_ID',
  client_secret = 'YOUR_GOOGLE_CLIENT_SECRET'
WHERE provider = 'google_calendar';
```

---

## 🔷 Outlook Calendar (Microsoft) OAuth Setup

### Step 1: Register Application in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: ProSpaces CRM Calendar
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: 
     - Platform: **Web**
     - URI: `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
5. Click **Register**

### Step 2: Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission** → **Microsoft Graph**
3. Select **Delegated permissions**
4. Add these permissions:
   - `Calendars.ReadWrite` (Read and write user calendars)
   - `Calendars.ReadWrite.Shared` (Read and write shared calendars)
   - `User.Read` (Read user profile)
5. Click **Add permissions**
6. Click **Grant admin consent** (if you have admin rights)

### Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Description: `ProSpaces CRM Calendar`
4. Expires: Choose duration (24 months recommended)
5. Click **Add**
6. **Copy the secret value immediately** - it won't be shown again!

### Step 4: Get Application (Client) ID

1. Go to **Overview** in your app registration
2. Copy the **Application (client) ID**

### Step 5: Store Credentials in Supabase

Run this SQL in your Supabase SQL Editor:

```sql
UPDATE oauth_secrets 
SET 
  client_id = 'YOUR_MICROSOFT_CLIENT_ID',
  client_secret = 'YOUR_MICROSOFT_CLIENT_SECRET'
WHERE provider = 'outlook_calendar';
```

---

## 🔧 Implementation Steps

### 1. Create Supabase Edge Function for OAuth

Create a new Edge Function to handle OAuth flow:

**File: `supabase/functions/calendar-oauth/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { provider, code, userId } = await req.json()
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  // Get OAuth credentials from secrets
  const { data: secrets } = await supabaseClient
    .from('oauth_secrets')
    .select('client_id, client_secret')
    .eq('provider', `${provider}_calendar`)
    .single()
  
  if (!secrets) {
    return new Response(JSON.stringify({ error: 'OAuth not configured' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Exchange authorization code for tokens
  let tokenUrl = ''
  let tokenBody = {}
  
  if (provider === 'google') {
    tokenUrl = 'https://oauth2.googleapis.com/token'
    tokenBody = {
      code,
      client_id: secrets.client_id,
      client_secret: secrets.client_secret,
      redirect_uri: `${Deno.env.get('SUPABASE_URL')}/auth/v1/callback`,
      grant_type: 'authorization_code'
    }
  } else if (provider === 'outlook') {
    tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    tokenBody = {
      code,
      client_id: secrets.client_id,
      client_secret: secrets.client_secret,
      redirect_uri: `${Deno.env.get('SUPABASE_URL')}/auth/v1/callback`,
      grant_type: 'authorization_code',
      scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access'
    }
  }
  
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(tokenBody as any)
  })
  
  const tokens = await tokenResponse.json()
  
  return new Response(JSON.stringify({ 
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 2. Create Sync Edge Function

**File: `supabase/functions/calendar-sync/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { accountId, direction = 'bidirectional' } = await req.json()
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  // Get calendar account
  const { data: account } = await supabaseClient
    .from('calendar_accounts')
    .select('*')
    .eq('id', accountId)
    .single()
  
  if (!account) {
    return new Response(JSON.stringify({ error: 'Account not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  let syncResults = {
    imported: 0,
    exported: 0,
    updated: 0,
    errors: 0
  }
  
  // Import from calendar to CRM
  if (direction === 'import' || direction === 'bidirectional') {
    // Fetch events from Google/Outlook
    // Map to appointments table
    // Create calendar_event_mappings
  }
  
  // Export from CRM to calendar
  if (direction === 'export' || direction === 'bidirectional') {
    // Fetch appointments from CRM
    // Push to Google/Outlook Calendar API
    // Update calendar_event_mappings
  }
  
  // Log sync operation
  await supabaseClient.from('calendar_sync_log').insert({
    calendar_account_id: accountId,
    user_id: account.user_id,
    sync_type: 'manual',
    sync_direction: direction,
    events_imported: syncResults.imported,
    events_exported: syncResults.exported,
    events_updated: syncResults.updated,
    errors: syncResults.errors,
    status: syncResults.errors > 0 ? 'partial' : 'success',
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString()
  })
  
  return new Response(JSON.stringify(syncResults), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

## 🔐 Security Best Practices

1. **Never commit credentials** - Use environment variables or Supabase Vault
2. **Use HTTPS only** in production
3. **Implement token refresh** - OAuth tokens expire
4. **Encrypt sensitive data** - Access/refresh tokens should be encrypted
5. **Audit logging** - Use `calendar_sync_log` table
6. **Rate limiting** - Respect API quotas (Google: 1M requests/day, Microsoft: varies)

---

## 📊 API Quotas & Limits

### Google Calendar API
- **Queries per day**: 1,000,000
- **Queries per 100 seconds per user**: 1,000
- **Recommended sync frequency**: Every 15-30 minutes

### Microsoft Graph API (Outlook)
- **Throttling limit**: Varies by tenant
- **Recommended**: Use delta queries for efficient syncing
- **Webhooks**: Consider using Microsoft Graph webhooks for real-time updates

---

## 🧪 Testing OAuth Flow

### Local Development

1. Update redirect URI to include localhost:
   ```
   http://localhost:5173/auth/callback
   ```

2. Test the OAuth flow:
   ```typescript
   // In your React component
   const initiateOAuth = (provider: 'google' | 'outlook') => {
     const authUrls = {
       google: `https://accounts.google.com/o/oauth2/v2/auth?
         client_id=${GOOGLE_CLIENT_ID}&
         redirect_uri=${REDIRECT_URI}&
         response_type=code&
         scope=https://www.googleapis.com/auth/calendar&
         access_type=offline&
         prompt=consent`,
       outlook: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?
         client_id=${MICROSOFT_CLIENT_ID}&
         response_type=code&
         redirect_uri=${REDIRECT_URI}&
         response_mode=query&
         scope=https://graph.microsoft.com/Calendars.ReadWrite offline_access`
     }
     
     window.location.href = authUrls[provider]
   }
   ```

---

## 🚀 Deployment Checklist

- [ ] Google Calendar API enabled
- [ ] Microsoft Graph API permissions granted
- [ ] OAuth credentials stored in Supabase
- [ ] Edge Functions deployed
- [ ] Redirect URIs configured correctly
- [ ] RLS policies tested
- [ ] Token refresh logic implemented
- [ ] Error handling in place
- [ ] Sync logs monitored

---

## 📚 Additional Resources

- [Google Calendar API Docs](https://developers.google.com/calendar/api/guides/overview)
- [Microsoft Graph Calendar Docs](https://learn.microsoft.com/en-us/graph/api/resources/calendar)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OAuth 2.0 Flow](https://oauth.net/2/)

---

## 🆘 Troubleshooting

### Issue: "redirect_uri_mismatch" error
**Solution**: Ensure redirect URI in code matches exactly what's configured in Google/Microsoft console

### Issue: "insufficient_scope" error
**Solution**: Request calendar scopes during OAuth flow with `access_type=offline` and `prompt=consent`

### Issue: Tokens expire
**Solution**: Implement refresh token logic to automatically renew access tokens

### Issue: Sync conflicts
**Solution**: Use `external_event_etag` field for optimistic locking and conflict detection

---

Need help? Check the Supabase logs or calendar sync logs table for detailed error messages.
