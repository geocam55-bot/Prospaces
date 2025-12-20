# ✅ DO THIS NOW - Email Setup Steps

## Current Situation
You're seeing: **"Unable to connect to email backend. The Edge Functions may not be deployed yet."**

This is **normal** - the Edge Functions aren't deployed yet.

---

## 🎯 Step-by-Step (Choose Your Path)

### PATH A: Quick Test with IMAP/SMTP (5 minutes)

#### Step 1: Run SQL Migration ✅ DO THIS FIRST
1. Open **Supabase SQL Editor**: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/sql
2. Click **"New Query"**
3. Copy ALL content from `/RUN_EMAIL_MIGRATION_COMPLETE.sql` (271 lines)
4. Paste it into the SQL Editor
5. Click **"Run"**
6. You should see: "Tables Created" and "Policies Created" ✅

#### Step 2: Test IMAP/SMTP Connection
1. Go to ProSpaces CRM: https://pro-spaces.vercel.app/
2. Login
3. Click **"Email"** in sidebar
4. Click **"Add Email Account"**
5. Click the **"IMAP/SMTP (Recommended)"** tab
6. Click **"Configure"**
7. Fill in your email settings (see below)
8. Click **"Connect Account"**

**Gmail Settings:**
- IMAP Server: `imap.gmail.com`
- IMAP Port: `993`
- SMTP Server: `smtp.gmail.com`
- SMTP Port: `465`
- Username: `your.email@gmail.com`
- Password: Get from https://myaccount.google.com/apppasswords

**Microsoft 365/Outlook:**
- IMAP Server: `outlook.office365.com`
- IMAP Port: `993`
- SMTP Server: `smtp.office365.com`
- SMTP Port: `587`
- Username: `your.email@outlook.com`
- Password: Your regular password

#### Expected Result:
⚠️ You'll see a warning: "Email configuration saved locally. Deploy backend functions to enable live email syncing."

This is **normal** - your config is saved, but full sync requires deploying the Edge Functions.

---

### PATH B: Deploy for Full OAuth Support (30-60 minutes)

This enables the Microsoft Outlook OAuth button to work.

#### Step 1: Run SQL Migration (same as Path A)
See Step 1 above ☝️

#### Step 2: Open GitHub Codespaces
1. Go to your GitHub repo
2. Click green **"Code"** button
3. Click **"Codespaces"** tab
4. Click **"Create codespace on main"**
   
Wait for it to load (opens VS Code in browser)

#### Step 3: Install Supabase CLI
In the Codespace terminal (bottom panel), run:
```bash
npm install -g supabase
```

#### Step 4: Login to Supabase
```bash
supabase login
```
This opens a browser tab - click "Authorize"

#### Step 5: Link Your Project
```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

#### Step 6: Get Nylas API Key
1. Go to https://dashboard.nylas.com
2. Sign up or login
3. Create a new application
4. Copy your API Key

#### Step 7: Set Nylas Secret
```bash
supabase secrets set NYLAS_API_KEY=paste_your_nylas_api_key_here
```

#### Step 8: Deploy Functions
```bash
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

Wait for all 7 functions to deploy (~2-3 minutes)

#### Step 9: Verify Deployment
```bash
supabase functions list
```

You should see all 7 functions! ✅

#### Step 10: Test OAuth in ProSpaces CRM
1. Go to https://pro-spaces.vercel.app/
2. Click **"Email"** → **"Add Email Account"**
3. Click **"OAuth"** tab
4. Click **"Microsoft Outlook"**
5. Click **"Connect Microsoft Outlook"**
6. You should see Nylas OAuth page (no more error!) 🎉

---

## Which Path Should You Choose?

**Choose PATH A if:**
- ✅ You want to test quickly
- ✅ You're okay with manual email config
- ✅ You'll deploy later

**Choose PATH B if:**
- ✅ You want full OAuth support now
- ✅ You need Microsoft Outlook OAuth working
- ✅ You have 30-60 minutes

---

## Files Reference

| File | Purpose |
|------|---------|
| `/RUN_EMAIL_MIGRATION_COMPLETE.sql` | Creates email tables in Supabase |
| `/DEPLOY_NYLAS_WEB_ONLY.md` | Full deployment guide |
| `/EMAIL_QUICK_START_WEB.md` | Detailed comparison of options |
| This file | Quick action steps |

---

## Summary

**Right now:** The SQL migration is the FIRST thing you need to do.

**After that:** Choose IMAP (quick test) or OAuth (full deployment).

**Both paths work!** IMAP saves your config locally, OAuth needs deployment but gives better UX.

---

## Quick Checklist

- [ ] Run `/RUN_EMAIL_MIGRATION_COMPLETE.sql` in Supabase SQL Editor
- [ ] Choose Path A (IMAP) or Path B (OAuth deployment)
- [ ] Follow the steps for your chosen path
- [ ] Test email connection in ProSpaces CRM

Done! 🚀
