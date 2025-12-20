# 🚀 Deploy Full OAuth - Step by Step

## ✅ Part 1: Run SQL Migration (REQUIRED FIRST)

### Step 1.1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/sql
2. Click **"New Query"**

### Step 1.2: Copy & Paste SQL
1. Open `/RUN_EMAIL_MIGRATION_COMPLETE.sql` in this project
2. **Copy ALL 271 lines** (Ctrl+A, Ctrl+C)
3. **Paste** into Supabase SQL Editor
4. Click **"Run"** button

### Step 1.3: Verify Success
You should see at the bottom:
```
✅ Tables Created: email_accounts, email_messages, email_attachments, oauth_secrets
✅ Policies Created: 13 policies listed
```

If you see any errors, let me know!

---

## ✅ Part 2: Get Nylas API Key

### Step 2.1: Sign Up for Nylas
1. Go to: https://dashboard.nylas.com/register
2. Sign up with your email
3. Verify your email

### Step 2.2: Create Application
1. In Nylas Dashboard, click **"Applications"** → **"Create App"**
2. App Name: `ProSpaces CRM`
3. Click **"Create"**

### Step 2.3: Copy API Key
1. You'll see your **API Key** on the dashboard
2. Copy it and save it somewhere safe (you'll need it in Step 4.7)
3. It looks like: `nyk_v0_abc123...`

### Step 2.4: Configure OAuth Providers
1. In Nylas Dashboard, click **"Integrations"**
2. Enable **"Google"** (for Gmail):
   - Click **"Connect"**
   - Follow Google OAuth setup wizard
   - Add redirect URI: `https://api.us.nylas.com/v3/connect/callback`
3. Enable **"Microsoft"** (for Outlook):
   - Click **"Connect"**
   - Follow Microsoft OAuth setup wizard
   - Add redirect URI: `https://api.us.nylas.com/v3/connect/callback`

**Note:** You can skip Apple Mail for now if you only need Gmail/Outlook.

---

## ✅ Part 3: Find Your GitHub Repository

### Step 3.1: Locate Your Repo
You need to know your GitHub repository URL. It should be something like:
- `https://github.com/YOUR_USERNAME/prospaces-crm`
- or whatever you named it

If you don't remember:
1. Go to https://github.com/YOUR_USERNAME?tab=repositories
2. Find your ProSpaces CRM repository
3. Copy the URL

---

## ✅ Part 4: Deploy via GitHub Codespaces

### Step 4.1: Open Your GitHub Repository
Go to your repo URL (from Step 3.1)

### Step 4.2: Create Codespace
1. Click the green **"<> Code"** button (top right)
2. Click **"Codespaces"** tab
3. Click **"Create codespace on main"**

**Wait 1-2 minutes** - it's setting up a cloud VS Code environment in your browser.

### Step 4.3: Verify Files Exist
In the Codespace file explorer (left sidebar), verify you see:
```
📁 supabase/
  📁 functions/
    📁 nylas-connect/
      📄 index.ts
    📁 nylas-callback/
      📄 index.ts
    📁 nylas-send-email/
      📄 index.ts
    ... (more functions)
```

If you see these, you're good! ✅

### Step 4.4: Open Terminal
In the Codespace, open the terminal:
- It's usually at the bottom
- Or click: **Terminal** → **New Terminal** (top menu)

### Step 4.5: Install Supabase CLI
In the terminal, run:
```bash
npm install -g supabase
```

Wait for it to finish (~30 seconds).

Verify installation:
```bash
supabase --version
```

You should see a version number like `1.x.x` ✅

### Step 4.6: Login to Supabase
Run:
```bash
supabase login
```

This will:
1. Display a URL in the terminal
2. Click the URL (or copy/paste into browser)
3. You'll see "Authorize Supabase CLI"
4. Click **"Authorize"**
5. Terminal shows: ✅ "Logged in successfully"

### Step 4.7: Set Nylas API Key as Secret
Run (replace with YOUR Nylas API key from Step 2.3):
```bash
supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_ACTUAL_KEY_HERE
```

**IMPORTANT:** Replace `nyk_v0_YOUR_ACTUAL_KEY_HERE` with your real Nylas API key!

You should see:
```
✅ Finished supabase secrets set.
```

### Step 4.8: Link Your Supabase Project
Run:
```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

You'll be asked to enter your database password. 

**Can't remember your password?**
1. Go to: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/settings/database
2. Scroll to "Database Password"
3. Click "Reset Database Password" if needed
4. Use that password

After entering password, you should see:
```
✅ Linked to project usorqldwroecyxucmtuw
```

### Step 4.9: Deploy All Nylas Functions
Run this single command:
```bash
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

This will deploy all 7 functions. **Wait 2-5 minutes**.

You'll see output like:
```
Deploying nylas-connect...
✅ Deployed nylas-connect

Deploying nylas-callback...
✅ Deployed nylas-callback

... (continues for all 7 functions)
```

### Step 4.10: Verify Deployment
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

All 7 functions listed! 🎉

---

## ✅ Part 5: Configure Nylas Redirect URIs

### Step 5.1: Get Your Function URLs
Your Nylas callback URL is:
```
https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback
```

### Step 5.2: Add to Nylas Dashboard
1. Go back to Nylas Dashboard: https://dashboard.nylas.com
2. Click your application → **"Settings"**
3. Find **"Redirect URIs"** section
4. Add:
   ```
   https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback
   ```
5. Click **"Save"**

---

## ✅ Part 6: Test OAuth in ProSpaces CRM

### Step 6.1: Open ProSpaces CRM
1. Go to: https://pro-spaces.vercel.app/ (or your deployed URL)
2. Login

### Step 6.2: Navigate to Email
1. Click **"Email"** in the left sidebar
2. Click **"Add Email Account"** button

### Step 6.3: Test Microsoft Outlook OAuth
1. Make sure you're on the **"OAuth"** tab (not IMAP/SMTP)
2. Select **"Microsoft Outlook"** from the dropdown
3. Click **"Connect Microsoft Outlook"** button

### Step 6.4: Expected Result
You should see:
1. ✅ No error message!
2. ✅ Redirects to Nylas OAuth page
3. ✅ Shows "Connect to Microsoft"
4. ✅ After clicking, goes to Microsoft login
5. ✅ After login, redirects back to ProSpaces
6. ✅ Shows "Email account connected successfully!"

### If You See Errors:
Check the Edge Function logs in Supabase:
1. Go to: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/functions/nylas-connect/logs
2. Look for error messages
3. Share them with me if you need help

---

## ✅ Part 7: Test Gmail OAuth

Repeat Step 6.3 but:
1. Select **"Gmail"** instead of Microsoft Outlook
2. Click **"Connect Gmail"**
3. Should redirect to Google OAuth

---

## 🎉 Success Checklist

- [ ] SQL migration ran successfully in Supabase
- [ ] Created Nylas account and got API key
- [ ] Configured Google and Microsoft integrations in Nylas
- [ ] Opened GitHub Codespace
- [ ] Installed Supabase CLI
- [ ] Logged in to Supabase CLI
- [ ] Set NYLAS_API_KEY secret
- [ ] Linked Supabase project
- [ ] Deployed all 7 Edge Functions
- [ ] Verified functions with `supabase functions list`
- [ ] Added redirect URI to Nylas Dashboard
- [ ] Tested Microsoft Outlook OAuth
- [ ] Tested Gmail OAuth

---

## 🛠️ Troubleshooting

### "Command not found: supabase"
- Run `npm install -g supabase` again
- Wait for it to complete
- Try `supabase --version`

### "Permission denied" when deploying
- Run `supabase login` again
- Make sure you authorized in the browser

### "Project not linked"
- Run `supabase link --project-ref usorqldwroecyxucmtuw` again
- Enter your database password

### "Function deployment failed"
- Check you're in the project root directory
- Run `pwd` to see current directory
- Should show: `/workspaces/YOUR_REPO_NAME`
- If not, run: `cd /workspaces/YOUR_REPO_NAME`

### "NYLAS_API_KEY not found" error in logs
- The secret wasn't set correctly
- Run `supabase secrets set NYLAS_API_KEY=your_key_here` again
- Make sure no typos in the key

### OAuth redirects to error page
- Check redirect URI in Nylas Dashboard matches exactly:
  `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback`
- Make sure Google/Microsoft integrations are enabled in Nylas

---

## 📝 Quick Command Reference

All commands in one place:

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Set secret
supabase secrets set NYLAS_API_KEY=your_actual_key_here

# Link project
supabase link --project-ref usorqldwroecyxucmtuw

# Deploy functions (all at once)
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event

# Verify
supabase functions list

# Check logs (if needed)
supabase functions logs nylas-connect --tail
```

---

## 🎯 Time Estimate

- Part 1 (SQL): 2 minutes
- Part 2 (Nylas setup): 10 minutes
- Part 3 (Find repo): 1 minute
- Part 4 (Deploy functions): 15-20 minutes
- Part 5 (Configure redirect): 2 minutes
- Part 6-7 (Testing): 5 minutes

**Total: ~30-40 minutes**

---

## ✅ What's Next After This Works?

1. Connect multiple email accounts for your team
2. Enable auto-sync for emails
3. Send emails directly from CRM
4. Link emails to contacts/opportunities
5. Set up calendar sync (similar process)

---

## 🆘 Need Help?

If you get stuck at any step, share:
1. Which step you're on (e.g., "Step 4.8")
2. The exact error message
3. Screenshot if possible

I'll help you troubleshoot! 🚀

---

## 📦 After Deployment

Once everything works:
1. Close the Codespace (you won't need it again unless you update functions)
2. OAuth will keep working for all users
3. You can manage connected accounts in ProSpaces CRM Settings

**The Codespace is just for deployment** - your app runs on Supabase Edge Functions after this!
