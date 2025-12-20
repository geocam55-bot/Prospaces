# Deploy Nylas Edge Functions (Web-Only Method)

## 🌐 Since you work exclusively through web interfaces, here are your options:

---

## ⚠️ Current Status

You're seeing this error: **"Unable to connect to email backend. The Edge Functions may not be deployed yet."**

This is because the Nylas Edge Functions need to be deployed to your Supabase project.

---

## Option 1: Use GitHub Codespaces (RECOMMENDED for Web Users)

### Step 1: Create a Codespace
1. Go to your GitHub repository: https://github.com/YOUR_USERNAME/YOUR_REPO
2. Click the green **"Code"** button
3. Click **"Codespaces"** tab
4. Click **"Create codespace on main"**

This opens a cloud-based VS Code environment in your browser.

### Step 2: Install Supabase CLI in Codespace
In the Codespace terminal, run:
```bash
npm install -g supabase
```

### Step 3: Login to Supabase
```bash
supabase login
```
This opens a browser tab to authenticate.

### Step 4: Link Your Project
```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

### Step 5: Set Nylas API Key
First, get your Nylas API key from https://dashboard.nylas.com, then:
```bash
supabase secrets set NYLAS_API_KEY=your_actual_nylas_api_key_here
```

### Step 6: Deploy All Functions
```bash
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
supabase functions deploy nylas-webhook
supabase functions deploy nylas-sync-calendar
supabase functions deploy nylas-create-event
```

Or deploy all at once:
```bash
cd /workspaces/YOUR_REPO_NAME
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

### Step 7: Verify
```bash
supabase functions list
```

You should see all 7 functions listed!

---

## Option 2: Deploy via Supabase Dashboard (Manual Method)

### ⚠️ Important Note
Supabase Dashboard doesn't have a built-in UI for deploying Edge Functions. You MUST use the CLI (see Option 1 above with Codespaces).

---

## Option 3: Use StackBlitz (Alternative Web IDE)

1. Go to https://stackblitz.com
2. Click **"Import from GitHub"**
3. Enter your repository URL
4. Follow the same steps as Option 1 (Codespaces)

---

## What You Need Before Starting

### 1. Nylas Account & API Key
- Sign up at https://nylas.com
- Create a new application
- Copy your **API Key** from the dashboard

### 2. Your Supabase Project Reference
- Already known: `usorqldwroecyxucmtuw`

---

## After Deployment

Once deployed, go back to ProSpaces CRM and:
1. Click **Email** in the sidebar
2. Click **"Add Email Account"**
3. Select **"Microsoft Outlook"** or **"Gmail"**
4. Click **"Connect Microsoft Outlook"** or **"Connect Gmail"**

The error should be **gone** and OAuth should work! 🎉

---

## Troubleshooting

### "Command 'supabase' not found"
You're not in a terminal environment. Use Option 1 (GitHub Codespaces).

### "Function deployment failed"
- Make sure you're in the project root directory
- Check that `supabase/functions/nylas-connect/index.ts` exists

### OAuth still doesn't work after deployment
Check the function logs in Supabase Dashboard:
1. Go to https://supabase.com/dashboard/project/usorqldwroecyxucmtuw
2. Click **"Edge Functions"** in the left sidebar
3. Click on **"nylas-connect"**
4. Click **"Logs"** tab
5. Look for errors

---

## File Locations (for reference)

Your Edge Functions are already in the GitHub repo at:
```
/supabase/functions/nylas-connect/index.ts
/supabase/functions/nylas-callback/index.ts
/supabase/functions/nylas-send-email/index.ts
/supabase/functions/nylas-sync-emails/index.ts
/supabase/functions/nylas-webhook/index.ts
/supabase/functions/nylas-sync-calendar/index.ts
/supabase/functions/nylas-create-event/index.ts
```

They just need to be **deployed** to make them live.

---

## Quick Summary

**For Web-Only Users:**
1. Use **GitHub Codespaces** (opens in browser)
2. Run CLI commands in Codespace terminal
3. Deploy functions
4. Test OAuth in ProSpaces CRM

**Time Required:** ~5-10 minutes

---

## Alternative: Ask Someone with CLI Access

If you have a teammate with local terminal access (Mac/Linux/Windows), they can:
1. Clone the repo
2. Run the deployment commands from `/DEPLOY_NYLAS_FUNCTIONS.md`
3. Functions will be deployed for everyone

---

## Next Steps After Deployment

1. ✅ Configure Nylas OAuth providers (Google, Microsoft) in Nylas Dashboard
2. ✅ Test email OAuth connections in ProSpaces CRM
3. ✅ Enable email syncing
4. ✅ Send test emails

See `/NYLAS_SETUP_GUIDE.md` for full Nylas configuration instructions.
