# 🚀 Quick Start - Email Integration

## Current Issue: Edge Functions Not Deployed

You're seeing "Failed to fetch" errors because the Nylas Edge Functions need to be deployed to your Supabase project.

---

## ⚡ Two Options:

### Option 1: Deploy Edge Functions (Real Email Integration)

Follow the steps below to deploy the functions and enable real email integration.

### Option 2: Use Demo Mode (No Deployment Required)

For now, you can test the UI with mock data:
1. Go to **Settings** → **Developer** tab
2. Click **"Enable Demo Mode"** button
3. This will add a demo Gmail account for testing the UI

---

## 📋 Deploy Edge Functions - Step by Step

### Prerequisites
- Supabase CLI installed
- A Nylas account (sign up at https://nylas.com)

### Step 1: Install Supabase CLI

**macOS/Linux:**
```bash
brew install supabase/tap/supabase
```

**Windows (PowerShell):**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Via npm (any OS):**
```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

This opens your browser for authentication.

### Step 3: Link Your Project

```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

You'll be asked to enter your database password (from your Supabase project settings).

### Step 4: Get Your Nylas API Key

1. Go to https://nylas.com and sign up/login
2. Create a new application
3. Copy your **API Key** from the dashboard
4. Keep this handy for the next step

### Step 5: Set Environment Secrets

```bash
supabase secrets set NYLAS_API_KEY=your_nylas_api_key_here
```

Replace `your_nylas_api_key_here` with your actual Nylas API key.

### Step 6: Deploy All Functions

```bash
cd /path/to/your/project

# Deploy all 4 functions at once
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
```

### Step 7: Verify Deployment

```bash
supabase functions list
```

You should see all 4 functions listed:
- ✅ nylas-connect
- ✅ nylas-callback
- ✅ nylas-send-email
- ✅ nylas-sync-emails

### Step 8: Test in ProSpaces CRM

1. Go to **Settings** → **Developer** tab
2. Click **"Run Diagnostic Test"**
3. You should see "✓ Function is working"
4. Go to **Email** module
5. Click **"Add Account"** → **Gmail** → **Connect with OAuth**
6. Complete the OAuth flow

---

## 🔧 Troubleshooting

### "supabase: command not found"
- Make sure CLI is installed correctly
- Try restarting your terminal
- Check PATH environment variable

### "Failed to link project"
- Double-check project ref: `usorqldwroecyxucmtuw`
- Make sure you're logged in: `supabase login`
- Verify your Supabase account has access to this project

### "Function deployment failed"
- Make sure you're in the project directory
- Check that `/supabase/functions/` folder exists
- Try deploying one function at a time

### "Nylas API key not configured"
- Set the secret: `supabase secrets set NYLAS_API_KEY=your_key`
- Verify: `supabase secrets list`
- Redeploy the function after setting the secret

### OAuth still fails after deployment
Check the logs:
```bash
supabase functions logs nylas-connect --tail
```

This shows real-time errors from the function.

---

## 📚 Additional Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Nylas Documentation](https://developer.nylas.com/)

---

## 💡 What Each Function Does

| Function | Purpose |
|----------|---------|
| `nylas-connect` | Initiates OAuth flow or connects IMAP accounts |
| `nylas-callback` | Handles OAuth callback from Google/Microsoft |
| `nylas-send-email` | Sends emails via Nylas API |
| `nylas-sync-emails` | Syncs emails from connected accounts |

---

## ✅ Next Steps After Deployment

1. ✨ Connect your Gmail account via OAuth
2. 📧 Send test emails
3. 🔄 Sync your inbox
4. 🔗 Link emails to contacts, bids, and appointments
5. 📊 Use email analytics in the Marketing module

---

## 🆘 Still Having Issues?

If you're stuck, you can:
1. Use **Demo Mode** in Settings → Developer to test the UI
2. Check the browser console (F12) for detailed error messages
3. Check Supabase function logs: `supabase functions logs nylas-connect`
