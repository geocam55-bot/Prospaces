# 🔧 Fix Both OAuth Issues - Complete Guide

## 🎯 What You're Seeing

Your screenshot shows **2 separate problems**:

### Problem 1: "OAuth Setup Required"
```
To use OAuth authentication, your administrator needs to configure:
• Azure AD app registration
• OAuth 2.0 client credentials
• Authorized redirect URIs
```

### Problem 2: "Unable to connect to email backend"
```
Unable to connect to email backend. The Edge Functions may not be deployed yet.
```

**Good news:** We'll fix both! Here's the complete solution.

---

## 📋 Complete Fix Plan

You need to do these in order:

1. ✅ Run SQL Migration (2 min)
2. ✅ Set up Nylas Account (15 min) ← **This fixes OAuth Setup Required**
3. ✅ Configure Microsoft OAuth in Nylas (10 min) ← **This fixes Azure AD**
4. ✅ Deploy Edge Functions (20 min) ← **This fixes backend connection**
5. ✅ Test OAuth (5 min)

**Total time:** ~50-60 minutes

---

## 🚀 PART 1: SQL Migration (2 min)

### Step 1.1: Open Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/sql

### Step 1.2: Run Migration
1. Click **"New Query"**
2. Copy **ALL 271 lines** from `/RUN_EMAIL_MIGRATION_COMPLETE.sql`
3. Paste into SQL Editor
4. Click **"Run"**

### Step 1.3: Verify Success
You should see:
```
✅ Tables Created: email_accounts, email_messages, email_attachments, oauth_secrets
✅ Policies Created: 13 policies
```

---

## 🎯 PART 2: Nylas Account Setup (15 min)

This will fix the "OAuth Setup Required" message!

### Step 2.1: Sign Up for Nylas
1. Go to: https://dashboard.nylas.com/register
2. Sign up with your email
3. Verify your email

### Step 2.2: Create Application
1. Click **"Create a New App"** (or "New Application")
2. **App Name:** `ProSpaces CRM`
3. Click **"Create"**

### Step 2.3: Copy API Key
1. You'll see your **API Key** (looks like `nyk_v0_abc123...`)
2. **COPY IT** and save somewhere safe (you'll need it later)
3. Keep this tab open!

---

## 🔐 PART 3: Configure Microsoft OAuth (10 min)

This is THE KEY to fixing "OAuth Setup Required"!

### Step 3.1: Enable Microsoft Integration in Nylas

1. In Nylas Dashboard, click **"Integrations"** (left sidebar)
2. Find **"Microsoft"** and click **"Configure"** or **"Connect"**
3. You'll see two options:

#### Option A: Use Nylas Hosted Auth (RECOMMENDED - EASIEST!)
- Click **"Use Nylas Hosted Auth"**
- Nylas handles ALL the Azure AD configuration for you
- No need to create Azure AD app yourself!
- **This is the fastest way** ✅

#### Option B: Use Your Own Azure AD App (Advanced)
If you want your own Azure AD app:

1. Go to: https://portal.azure.com
2. Click **"Azure Active Directory"**
3. Click **"App registrations"** → **"New registration"**
4. **Name:** `ProSpaces CRM Email`
5. **Supported account types:** "Accounts in any organizational directory and personal Microsoft accounts"
6. **Redirect URI:** 
   - Platform: **Web**
   - URL: `https://api.us.nylas.com/v3/connect/callback`
7. Click **"Register"**

8. **Copy the Client ID** (Application ID)

9. Click **"Certificates & secrets"** → **"New client secret"**
   - Description: `ProSpaces CRM Secret`
   - Expires: 24 months
   - Click **"Add"**
   - **COPY THE SECRET VALUE** (you can only see it once!)

10. Click **"API permissions"** → **"Add a permission"**
    - Microsoft Graph → Delegated permissions
    - Add these:
      - `Mail.Read`
      - `Mail.ReadWrite`
      - `Mail.Send`
      - `offline_access`
      - `User.Read`
    - Click **"Add permissions"**
    - Click **"Grant admin consent"** (if you're admin)

11. Go back to Nylas Dashboard
12. Paste your **Client ID** and **Client Secret**
13. Click **"Save"**

### Step 3.2: Enable Google Integration (Optional but Recommended)

1. In Nylas Dashboard, click **"Integrations"**
2. Find **"Google"** and click **"Configure"**
3. Choose **"Use Nylas Hosted Auth"** (easiest!)
4. Or follow similar steps as Microsoft if you want your own OAuth app

### Step 3.3: Configure Redirect URIs

Still in Nylas Dashboard:
1. Click your app → **"Settings"**
2. Find **"Allowed Redirect URIs"** or **"Redirect URIs"**
3. Add this URL:
   ```
   https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback
   ```
4. Click **"Save"**

**IMPORTANT:** We'll come back and verify this works after deploying Edge Functions!

---

## 🚀 PART 4: Deploy Edge Functions (20 min)

This fixes the "Unable to connect to email backend" error!

### Step 4.1: Open GitHub Codespace

1. Go to your GitHub repository
2. Click green **"<> Code"** button
3. Click **"Codespaces"** tab
4. Click **"Create codespace on main"**
5. Wait 1-2 minutes for it to load

### Step 4.2: Open Terminal

Once Codespace loads:
- Terminal should be at the bottom
- Or click: **Terminal** → **New Terminal**

### Step 4.3: Install Supabase CLI

Run this in the terminal:
```bash
npm install -g supabase
```

Wait for it to finish (~30 seconds).

Verify:
```bash
supabase --version
```
Should show version like `1.x.x` ✅

### Step 4.4: Login to Supabase

Run:
```bash
supabase login
```

This will:
1. Show a URL in the terminal
2. Click the URL (opens in new tab)
3. Click **"Authorize Supabase CLI"**
4. Terminal shows: "Logged in successfully" ✅

### Step 4.5: Set Nylas API Key Secret

Run (replace with YOUR Nylas API key from Part 2):
```bash
supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_ACTUAL_KEY_HERE
```

**IMPORTANT:** Replace `nyk_v0_YOUR_ACTUAL_KEY_HERE` with your real key!

You should see:
```
✅ Finished supabase secrets set.
```

### Step 4.6: Link Your Supabase Project

Run:
```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

You'll be asked for your **database password**.

**Don't know your password?**
1. Go to: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/settings/database
2. Scroll to "Database Password"
3. Click **"Reset Database Password"**
4. Copy the new password
5. Paste it in the terminal

After entering password:
```
✅ Linked to project usorqldwroecyxucmtuw
```

### Step 4.7: Deploy All Nylas Functions

Run this ONE command (all on one line):
```bash
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

**Wait 2-5 minutes** - it's deploying 7 functions.

You'll see:
```
Deploying nylas-connect...
✅ Deployed nylas-connect

Deploying nylas-callback...
✅ Deployed nylas-callback

... (continues for all 7 functions)
```

### Step 4.8: Verify Deployment

Run:
```bash
supabase functions list
```

You should see:
```
✅ nylas-connect
✅ nylas-callback
✅ nylas-send-email
✅ nylas-sync-emails
✅ nylas-webhook
✅ nylas-sync-calendar
✅ nylas-create-event
```

All 7 functions! 🎉

---

## 🎯 PART 5: Final Configuration (2 min)

### Step 5.1: Verify Nylas Redirect URI (Again)

Now that functions are deployed, verify the redirect URI in Nylas:

1. Go to Nylas Dashboard: https://dashboard.nylas.com
2. Click your app → **"Settings"**
3. **Allowed Redirect URIs** should have:
   ```
   https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback
   ```
4. If not, add it and click **"Save"**

### Step 5.2: Verify Microsoft Integration

1. In Nylas Dashboard, click **"Integrations"**
2. **Microsoft** should show **"Connected"** or **"Configured"** ✅
3. If not, go back to Part 3 and complete Microsoft setup

---

## ✅ PART 6: Test OAuth (5 min)

### Step 6.1: Test in ProSpaces CRM

1. Go to: https://pro-spaces.vercel.app/
2. Login
3. Click **"Email"** in sidebar
4. Click **"Add Email Account"**

### Step 6.2: Try Microsoft Outlook OAuth

1. Make sure **"OAuth"** tab is selected (not IMAP/SMTP)
2. Select **"Microsoft Outlook"** from dropdown
3. Click **"Connect Microsoft Outlook"**

### Step 6.3: Expected Result

You should see:

1. ✅ **NO error messages** (both errors gone!)
2. ✅ Redirects to Nylas authorization page
3. ✅ Shows "Connect to Microsoft"
4. ✅ After clicking, goes to Microsoft login
5. ✅ After login, returns to ProSpaces
6. ✅ Shows **"Email account connected successfully!"**

### If You Still See Errors:

#### Still seeing "OAuth Setup Required"?
- Microsoft integration not enabled in Nylas
- Go back to Part 3, Step 3.1
- Make sure Microsoft shows "Connected" in Nylas Dashboard

#### Still seeing "Unable to connect to email backend"?
- Edge Functions not deployed correctly
- Run `supabase functions list` in Codespace
- Should show 7 functions
- If not, try deploying again (Part 4, Step 4.7)

#### Redirects to error page?
- Redirect URI mismatch
- Check Nylas Dashboard → Settings → Redirect URIs
- Must be EXACTLY: `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback`

---

## 🎉 Success Checklist

- [ ] SQL migration ran successfully
- [ ] Nylas account created
- [ ] Nylas API key saved
- [ ] Microsoft integration enabled in Nylas (Connected status)
- [ ] Google integration enabled in Nylas (optional)
- [ ] Redirect URI configured in Nylas
- [ ] GitHub Codespace opened
- [ ] Supabase CLI installed
- [ ] Logged in to Supabase
- [ ] Nylas API key secret set
- [ ] Supabase project linked
- [ ] All 7 functions deployed
- [ ] Functions list shows 7 functions
- [ ] Tested Microsoft Outlook OAuth - SUCCESS!
- [ ] No more "OAuth Setup Required" error
- [ ] No more "Unable to connect to email backend" error

---

## 🔍 Troubleshooting

### "OAuth Setup Required" still shows
**Cause:** Microsoft/Google not configured in Nylas

**Fix:**
1. Go to Nylas Dashboard → Integrations
2. Click **Microsoft** → **Configure**
3. Choose **"Use Nylas Hosted Auth"**
4. Click **"Save"**
5. Should show "Connected" status

### "Unable to connect to email backend" still shows
**Cause:** Edge Functions not deployed

**Fix:**
```bash
# In Codespace terminal:
supabase link --project-ref usorqldwroecyxucmtuw
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
supabase functions list  # Verify all 7 show up
```

### OAuth redirects to error page
**Cause:** Redirect URI mismatch

**Fix:**
1. Nylas Dashboard → Settings
2. Add EXACT URL: `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback`
3. Save

### "NYLAS_API_KEY not found" in logs
**Cause:** Secret not set correctly

**Fix:**
```bash
supabase secrets set NYLAS_API_KEY=your_actual_key_here
```

---

## 📊 What Each Part Fixes

| Part | Fixes Which Error |
|------|-------------------|
| 1. SQL Migration | Database structure |
| 2. Nylas Account | Gets API credentials |
| 3. Microsoft OAuth Config | ✅ **"OAuth Setup Required"** |
| 4. Deploy Functions | ✅ **"Unable to connect to email backend"** |
| 5. Redirect URIs | OAuth flow completion |
| 6. Testing | Verifies everything works |

---

## 🎯 Why You Had Both Errors

1. **"OAuth Setup Required"** = Nylas needs Microsoft/Google OAuth apps configured
2. **"Unable to connect to email backend"** = Edge Functions not deployed yet

Both are required for OAuth to work! That's why we fixed both.

---

## ⏱️ Time Breakdown

- Part 1: SQL Migration - 2 min
- Part 2: Nylas Account - 15 min
- Part 3: Microsoft OAuth - 10 min
- Part 4: Deploy Functions - 20 min
- Part 5: Final Config - 2 min
- Part 6: Testing - 5 min

**Total: ~50-60 minutes**

---

## 🎉 After Success

Once both errors are gone and OAuth works:
- ✅ Users can connect Gmail/Outlook with one click
- ✅ Emails sync automatically
- ✅ Send emails from CRM
- ✅ Calendar sync available
- ✅ Production-ready email integration

---

## 🆘 Need Help?

If you get stuck, share:
1. Which Part you're on (1-6)
2. Which Step (e.g., "Part 4, Step 4.7")
3. Exact error message
4. Screenshot if possible

I'll help you troubleshoot! 🚀

---

**Ready? Start with Part 1!** ✅
