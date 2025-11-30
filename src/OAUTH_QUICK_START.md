# Gmail OAuth Quick Start

## What's Been Implemented ✅

You now have a **complete Gmail OAuth integration** ready to use! Here's what's included:

### 1. **Database Schema** (`/supabase/migrations/`)
- `email_accounts` table - Stores OAuth tokens and account info
- `email_messages` table - Stores synced emails
- `email_attachments` table - Stores file attachments
- `oauth_states` table - CSRF protection for OAuth flow
- `oauth_secrets` table - Securely stores OAuth credentials
- Row Level Security (RLS) policies for multi-tenant isolation

### 2. **Edge Functions** (`/supabase/functions/`)
- `gmail-oauth-init` - Generates Google OAuth authorization URL
- `gmail-oauth-callback` - Handles OAuth callback and stores tokens
- `gmail-sync` - Syncs emails from Gmail API to Supabase

### 3. **Frontend Integration**
- Updated `EmailAccountSetup.tsx` with working OAuth flow
- Opens popup window for Google authentication
- Automatic token storage in Supabase
- Seamless account connection experience

---

## Setup Steps (5 minutes)

### Step 1: Google Cloud Console

1. **Go to:** https://console.cloud.google.com
2. **Create a project** (or select existing)
3. **Enable Gmail API**:
   - APIs & Services → Library → Search "Gmail API" → Enable
4. **Configure OAuth consent screen**:
   - External user type
   - Add scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`, `userinfo.email`
5. **Create OAuth credentials**:
   - Credentials → Create Credentials → OAuth client ID
   - Web application
   - Add redirect URI: `https://YOUR-PROJECT.supabase.co/functions/v1/gmail-oauth-callback`
   - **Copy Client ID and Client Secret**

### Step 2: Supabase Setup

1. **Run migrations**:
```bash
supabase db push
```

2. **Store OAuth credentials** (in Supabase SQL Editor):
```sql
INSERT INTO oauth_secrets (provider, client_id, client_secret)
VALUES (
  'gmail',
  'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  'YOUR_GOOGLE_CLIENT_SECRET'
);
```

3. **Deploy Edge Functions**:
```bash
supabase functions deploy gmail-oauth-init
supabase functions deploy gmail-oauth-callback
supabase functions deploy gmail-sync
```

### Step 3: Test It!

1. Go to your app → **Email** module
2. Click **"Add Email Account"**
3. Click **"OAuth"** tab
4. Click **"Connect Gmail"**
5. Sign in with Google → Grant permissions
6. Account automatically connected! ✅

---

## How It Works

### OAuth Flow:
```
1. User clicks "Connect Gmail"
   ↓
2. Frontend calls gmail-oauth-init Edge Function
   ↓
3. Edge Function generates Google OAuth URL
   ↓
4. Popup opens with Google sign-in
   ↓
5. User grants permissions
   ↓
6. Google redirects to gmail-oauth-callback
   ↓
7. Edge Function exchanges code for tokens
   ↓
8. Tokens stored in email_accounts table (encrypted via RLS)
   ↓
9. Account appears in app, ready to sync emails!
```

### Email Sync:
```
1. User clicks "Sync" button
   ↓
2. Frontend calls gmail-sync Edge Function
   ↓
3. Edge Function fetches emails from Gmail API
   ↓
4. Emails stored in email_messages table
   ↓
5. Frontend displays emails from Supabase
```

---

## Current Features ✅

- ✅ **Full OAuth2 flow** with popup authentication
- ✅ **Secure token storage** in Supabase with RLS
- ✅ **Automatic token refresh** (tokens auto-renewed)
- ✅ **Email sync** from Gmail API
- ✅ **Multi-account support** (connect multiple Gmail accounts)
- ✅ **Multi-tenant isolation** (accounts scoped to organization)
- ✅ **CSRF protection** with state parameter
- ✅ **Edit/delete accounts** in settings
- ✅ **IMAP/SMTP fallback** option (for non-OAuth users)

---

## What You Can Do Now

### Option 1: IMAP/SMTP (Works Immediately)
- No setup required
- Use app-specific passwords
- Works with any email provider
- **Recommended for most users**

### Option 2: Gmail OAuth (Requires Setup)
- Follow setup steps above (5 minutes)
- More secure than IMAP passwords
- Access to Gmail API features
- Auto token refresh
- **Best for power users & scale**

---

## Files Created/Modified

### New Files:
- `/supabase/migrations/20231112000000_email_oauth.sql`
- `/supabase/migrations/20231112000001_oauth_states.sql`
- `/supabase/functions/gmail-oauth-init/index.ts`
- `/supabase/functions/gmail-oauth-callback/index.ts`
- `/supabase/functions/gmail-sync/index.ts`
- `/OAUTH_SETUP_GUIDE.md` (detailed guide)
- `/OAUTH_QUICK_START.md` (this file)

### Modified Files:
- `/components/EmailAccountSetup.tsx` - Added OAuth flow
- `/components/Email.tsx` - Added edit/delete account options

---

## Next Steps

### Immediate:
1. Follow setup steps above to connect Gmail
2. Test the OAuth flow
3. Sync some emails

### Future Enhancements:
- [ ] Automatic background sync (cron job)
- [ ] Email sending via Gmail API
- [ ] Attachment support
- [ ] Real-time push notifications (Gmail webhooks)
- [ ] Outlook/Microsoft OAuth support
- [ ] Email templates
- [ ] Email tracking (open/click)

---

## Troubleshooting

**"Failed to initiate OAuth flow"**
- OAuth credentials not configured in Supabase
- Run the SQL query in Step 2

**"Invalid redirect URI"**
- Redirect URI in Google Cloud doesn't match your Supabase URL
- Must be exact: `https://YOUR-PROJECT.supabase.co/functions/v1/gmail-oauth-callback`

**"Popup blocked"**
- Browser blocked popup
- Allow popups for your domain

**"No new emails syncing"**
- Check Edge Function logs: `supabase functions logs gmail-sync`
- Token may have expired (should auto-refresh)

---

## Cost

- **Supabase:** Free tier is generous (500K Edge Function invocations/month)
- **Gmail API:** Free with quotas (1B quota units/day)
- **Total:** $0 for most use cases 🎉

---

## Support

Need help? Check:
1. `/OAUTH_SETUP_GUIDE.md` - Detailed setup guide
2. Supabase logs - `supabase functions logs <function-name>`
3. Browser console - Check for errors
4. Google Cloud Console - Verify OAuth setup

---

## You're All Set! 🚀

You now have enterprise-grade email integration with:
- Secure OAuth authentication
- Automatic token management  
- Multi-tenant data isolation
- Real email syncing from Gmail

Just follow the setup steps and you'll be syncing emails in minutes!
