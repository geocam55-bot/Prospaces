# 📧 Complete Nylas + Supabase Setup Guide

This guide walks you through connecting Nylas to your Supabase backend for real email functionality.

---

## Part 1: Create Nylas Account & Get API Key

### Step 1: Sign Up for Nylas

1. Go to **https://www.nylas.com**
2. Click **"Get Started Free"** or **"Sign Up"**
3. Create your account with email/password
4. Verify your email address

### Step 2: Create Your First Application

1. After logging in, you'll land on the Nylas Dashboard
2. Click **"Create Application"** (or it might already create one for you)
3. Give it a name like **"ProSpaces CRM"**
4. Click **Create**

### Step 3: Get Your API Key

1. In the Nylas Dashboard, click on your application
2. Go to **"App Settings"** in the left sidebar
3. You'll see:
   - **Client ID** (looks like: `6vfj5...`)
   - **API Key** (looks like: `nylas_...`)
   - **API Secret**
4. **Copy the API Key** (starts with `nylas_`) - you'll need this!

**Keep this safe! Don't share it publicly.**

---

## Part 2: Configure Email Providers in Nylas

You have 3 options - choose what you need:

### Option A: Gmail (Recommended - Best User Experience)

1. In Nylas Dashboard, go to **"Integrations"** → **"Google"**
2. Click **"Configure"** or **"Enable"**
3. You'll need to create a Google Cloud Project:

#### Creating Google OAuth Credentials:

1. Go to **https://console.cloud.google.com/**
2. Create a new project (or select existing)
3. Enable **Gmail API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Gmail API"
   - Click **Enable**
4. Create OAuth credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **"Create Credentials"** → **"OAuth client ID"**
   - If prompted, configure OAuth consent screen first:
     - Choose **"External"**
     - Fill in app name: **"ProSpaces CRM"**
     - Add your email
     - Save
   - Back to create OAuth client ID:
     - Application type: **Web application**
     - Name: **"ProSpaces CRM"**
     - **Authorized redirect URIs** - Add this EXACT URL:
       ```
       https://api.us.nylas.com/v3/connect/callback
       ```
   - Click **Create**
   - Copy the **Client ID** and **Client Secret**

5. Back in Nylas Dashboard:
   - Paste the Google **Client ID**
   - Paste the Google **Client Secret**
   - Click **Save**

✅ Gmail is now ready!

### Option B: Outlook/Microsoft (For Microsoft users)

1. In Nylas Dashboard, go to **"Integrations"** → **"Microsoft"**
2. Click **"Configure"**
3. You'll need to create an Azure AD App:

#### Creating Microsoft OAuth Credentials:

1. Go to **https://portal.azure.com/**
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **"New registration"**
4. Fill in:
   - Name: **"ProSpaces CRM"**
   - Supported account types: **"Accounts in any organizational directory and personal Microsoft accounts"**
   - Redirect URI: **Web** → 
     ```
     https://api.us.nylas.com/v3/connect/callback
     ```
5. Click **Register**
6. Copy the **Application (client) ID**
7. Go to **Certificates & secrets** → **New client secret**
   - Description: **"Nylas Integration"**
   - Expires: **24 months**
   - Click **Add**
   - **Copy the secret VALUE immediately** (you can't see it again!)
8. Go to **API permissions** → **Add a permission**
   - Choose **Microsoft Graph**
   - Choose **Delegated permissions**
   - Add: `Mail.Read`, `Mail.Send`, `Mail.ReadWrite`, `offline_access`, `User.Read`
   - Click **Add permissions**

9. Back in Nylas Dashboard:
   - Paste the **Application (client) ID**
   - Paste the **Client Secret**
   - Click **Save**

✅ Outlook is now ready!

### Option C: IMAP/SMTP (For any email provider)

**No configuration needed!** IMAP/SMTP works out of the box with Nylas.

Users will enter their email settings directly in your app:
- IMAP Host: `imap.gmail.com` (or their provider)
- Port: `993` (or `143`)
- Username: their email
- Password: their email password

---

## Part 3: Deploy Supabase Functions

### Step 1: Install Supabase CLI (if not installed)

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows (with Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or download from: https://github.com/supabase/cli/releases
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open a browser - login to your Supabase account.

### Step 3: Link Your Project

```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

Enter your database password when prompted.

### Step 4: Set Nylas API Key as Secret

```bash
supabase secrets set NYLAS_API_KEY=ProSpaces CRM
```

Replace `nylas_your_actual_api_key_here` with the API key from Part 1, Step 3.

**Verify it was set:**
```bash
supabase secrets list
```

You should see `NYLAS_API_KEY` in the list.

### Step 5: Deploy the Edge Functions

```bash
# Deploy all 4 Nylas functions
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
```

Each deployment should show:
```
✓ Deployed Function nylas-connect
```

### Step 6: Run Database Migrations (if not done already)

```bash
supabase db push
```

This creates the `email_accounts` and `email_messages` tables.

---

## Part 4: Update Nylas Redirect URI (Important!)

Now that your functions are deployed, update the redirect URI in Nylas:

1. Go back to **Nylas Dashboard** → **App Settings**
2. Under **OAuth Settings** or **Callback URLs**, add:
   ```
   https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback
   ```
3. Click **Save**

---

## Part 5: Test It!

### Test in Your App:

1. Open your ProSpaces CRM
2. Go to **Email** module
3. Click **"Add Account"**
4. Choose a provider:
   - **Gmail** → Opens OAuth popup → Sign in with Google
   - **Outlook** → Opens OAuth popup → Sign in with Microsoft
   - **IMAP** → Enter your email settings manually

### Test Sending:

1. After connecting an account, click **"Compose"**
2. Send a test email to yourself
3. Check that it actually arrives!

### Test Receiving:

1. Send yourself an email from another account
2. In ProSpaces, click the **"Sync"** button
3. Your email should appear!

---

## Troubleshooting

### "Nylas API key not configured"

**Problem:** Edge Function can't find your API key

**Solution:**
```bash
# Check if the secret exists
supabase secrets list

# If not there, set it again
supabase secrets set NYLAS_API_KEY=your_key_here
```

### OAuth Redirect Error

**Problem:** "Redirect URI mismatch" error

**Solution:**
1. Make sure you added the EXACT redirect URI in both:
   - Google/Microsoft OAuth settings: `https://api.us.nylas.com/v3/connect/callback`
   - Nylas App Settings: `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback`

### "Failed to send email"

**Problem:** Email doesn't send

**Solution:**
1. Check Edge Function logs:
   ```bash
   supabase functions logs nylas-send-email
   ```
2. Make sure your Nylas account is verified
3. Check that the email account is connected in Nylas Dashboard

### "Failed to sync emails"

**Problem:** Can't fetch emails

**Solution:**
1. Check Edge Function logs:
   ```bash
   supabase functions logs nylas-sync-emails
   ```
2. Verify the account is connected in Nylas Dashboard → Accounts
3. Try disconnecting and reconnecting the account

### Check Edge Function Logs

For any issues:
```bash
# View all function logs
supabase functions logs

# View specific function
supabase functions logs nylas-send-email --tail
```

---

## What You Get

After setup, you'll have:

✅ **Real email sending** through Gmail, Outlook, or IMAP  
✅ **Real email receiving** - sync emails into your CRM  
✅ **OAuth authentication** - secure, no password storage  
✅ **Multi-account support** - users can connect multiple emails  
✅ **Free tier** - up to 100 connected accounts  

---

## Nylas Pricing

- **Free Tier**: 100 connected accounts forever
- **Paid Plans**: Start at $12/month for unlimited accounts
- **Enterprise**: Custom pricing for large deployments

For most small businesses, **the free tier is plenty!**

---

## Next Steps

### Optional Enhancements (can add later):

1. **Webhooks** - Get real-time email notifications instead of manual sync
2. **Threads** - Group emails into conversations
3. **Attachments** - Download/upload file attachments
4. **Calendar Integration** - Sync calendars too
5. **Contacts Sync** - Import email contacts into CRM

---

## Need Help?

- **Nylas Docs**: https://developer.nylas.com/docs/
- **Supabase Docs**: https://supabase.com/docs/guides/functions
- **Nylas Dashboard**: https://dashboard.nylas.com/

---

**Ready to go!** Follow the steps above and you'll have real email in ~10 minutes. 🚀
