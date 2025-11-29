# 🚀 Activate Live Email Integration - Complete Guide

## 📋 What You Need (5 minutes setup)

1. **Supabase CLI** - Command line tool to deploy functions
2. **Nylas Account** - Free email API service (or use IMAP directly)
3. **Your Supabase Project** - Already connected: `usorqldwroecyxucmtuw`

---

## ⚡ Option 1: Quick IMAP Setup (No Deployment Needed!)

**This works immediately without deploying Edge Functions:**

1. Go to **Email** module → Click **"Add Account"**
2. Select **IMAP/SMTP** tab
3. Use these settings for Gmail:
   - **IMAP Server:** `imap.gmail.com`
   - **Port:** `993`
   - **Username:** Your Gmail address
   - **Password:** [Create App Password](https://myaccount.google.com/apppasswords)

**Note:** IMAP setup stores credentials locally in your browser. For production use with real users, deploy the Edge Functions for server-side storage.

---

## ⚡ Option 2: Full OAuth Setup (Recommended for Production)

### Step 1: Install Supabase CLI

Choose your platform:

**macOS/Linux:**
```bash
brew install supabase/tap/supabase
```

**Windows (PowerShell - Run as Admin):**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**npm (Any OS):**
```bash
npm install -g supabase
```

**Verify Installation:**
```bash
supabase --version
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser. Login with your Supabase credentials.

### Step 3: Link Your Project

```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

When prompted:
- Enter your **Database Password** (from Supabase Dashboard → Settings → Database)

### Step 4: Get Nylas API Key (Free Tier Available)

1. Go to [https://nylas.com](https://nylas.com)
2. Sign up for a free account
3. Create a new application
4. Copy your **API Key** from the Nylas Dashboard
5. **Important:** Also set up OAuth credentials:
   - Add `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback` as redirect URI
   - Enable Gmail and/or Microsoft OAuth providers

### Step 5: Set Nylas API Key Secret

```bash
supabase secrets set NYLAS_API_KEY=your_actual_nylas_api_key_here
```

Replace `your_actual_nylas_api_key_here` with your actual Nylas API key.

**Verify the secret was set:**
```bash
supabase secrets list
```

You should see `NYLAS_API_KEY` in the list.

### Step 6: Deploy Edge Functions

**Make sure you're in your project directory where the code is:**

```bash
# Navigate to your project directory
cd /path/to/ProSpacesCRM

# Deploy all 4 email functions
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
```

Each deployment should show:
```
✅ Deployed Function nylas-connect on project usorqldwroecyxucmtuw
```

### Step 7: Verify Deployment

```bash
supabase functions list
```

You should see:
```
┌────────────────────┬─────────┬─────────┐
│ NAME               │ STATUS  │ REGION  │
├────────────────────┼─────────┼─────────┤
│ nylas-connect      │ ACTIVE  │ us-east │
│ nylas-callback     │ ACTIVE  │ us-east │
│ nylas-send-email   │ ACTIVE  │ us-east │
│ nylas-sync-emails  │ ACTIVE  │ us-east │
└────────────────────┴─────────┴─────────┘
```

### Step 8: Test in ProSpaces CRM

1. Open your CRM application
2. Go to **Settings** → **Developer** tab
3. Click **"Run Diagnostic Test"**
4. You should see: ✅ **"Function is working"**
5. Go to **Email** module
6. Click **"Add Account"** → **OAuth** tab → **Gmail**
7. Click **"Connect Gmail"**
8. Complete the OAuth flow in the popup

---

## 🔍 Troubleshooting

### Issue: "supabase: command not found"

**Solutions:**
- Restart your terminal after installation
- Check if CLI is in your PATH
- Try the npm installation method instead

### Issue: "Failed to link project"

**Solutions:**
- Verify project ref is correct: `usorqldwroecyxucmtuw`
- Make sure you're logged in: `supabase login`
- Check you have access to this project in Supabase Dashboard

### Issue: "Nylas API key not configured"

**Solutions:**
```bash
# Set the secret
supabase secrets set NYLAS_API_KEY=your_key_here

# Verify it's set
supabase secrets list

# Redeploy the functions after setting secrets
supabase functions deploy nylas-connect
```

### Issue: "Function deployment failed"

**Solutions:**
- Make sure you're in the correct directory (where `/supabase/functions/` exists)
- Check the error message for specifics
- View logs: `supabase functions logs nylas-connect`

### Issue: OAuth still fails after deployment

**Check the logs in real-time:**
```bash
supabase functions logs nylas-connect --tail
```

Then try connecting again and watch for errors.

**Common OAuth issues:**
- Redirect URI mismatch in Nylas Dashboard
- OAuth credentials not configured in Nylas
- Missing scopes in OAuth setup

---

## 🎯 What Happens After Activation

### With Nylas (OAuth):
✅ Connect Gmail/Outlook with one click  
✅ Send emails directly from the CRM  
✅ Auto-sync inbox (scheduled)  
✅ Link emails to contacts, bids, appointments  
✅ Server-side secure credential storage  
✅ Support multiple users/organizations  

### With IMAP (Direct):
✅ Connect any email provider immediately  
✅ Use your existing IMAP credentials  
✅ No external dependencies  
⚠️ Credentials stored in browser localStorage  
⚠️ Manual sync only  

---

## 📊 Function Details

| Function | Purpose | When It's Called |
|----------|---------|------------------|
| `nylas-connect` | Initiates OAuth or IMAP connection | When user clicks "Connect" |
| `nylas-callback` | Handles OAuth redirect from Google/MS | After user authorizes in popup |
| `nylas-send-email` | Sends emails via Nylas API | When user clicks "Send" |
| `nylas-sync-emails` | Fetches new emails from inbox | When user clicks "Sync" |

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] Diagnostic test shows "✓ Function is working"
- [ ] Can add Gmail account via OAuth
- [ ] OAuth popup opens and completes successfully
- [ ] Connected account appears in Email module
- [ ] Can view inbox emails
- [ ] Can send test email
- [ ] Can sync emails

---

## 💡 Pro Tips

1. **Start with Demo Mode** to learn the interface before connecting real accounts
2. **Use IMAP first** if you want to test quickly without Nylas setup
3. **OAuth is better for production** - more secure and supports multiple users
4. **Monitor function logs** during initial testing to catch issues early
5. **Set up Nylas webhooks** for automatic email sync (advanced)

---

## 🔗 Helpful Links

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Nylas Quick Start](https://developer.nylas.com/docs/the-basics/quickstart/)
- [Gmail App Passwords](https://myaccount.google.com/apppasswords)

---

## 🆘 Need Help?

1. **Check browser console** (F12) for detailed error messages
2. **Check function logs**: `supabase functions logs nylas-connect --tail`
3. **Test with diagnostic tool** in Settings → Developer
4. **Use Demo Mode** to verify the UI works correctly

---

**Ready to activate? Choose Option 1 (IMAP - 2 minutes) or Option 2 (OAuth - 10 minutes)!**
