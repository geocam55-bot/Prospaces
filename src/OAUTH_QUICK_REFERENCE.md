# 🚀 OAuth Deployment - Quick Reference Card

**Keep this open while you work!**

---

## 📋 Commands Cheat Sheet

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref usorqldwroecyxucmtuw

# Set Nylas secret
supabase secrets set NYLAS_API_KEY=your_key_here

# Deploy all functions (one command)
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event

# Verify deployment
supabase functions list

# Check logs (if needed)
supabase functions logs nylas-connect --tail
```

---

## 🔗 Important URLs

| What | URL |
|------|-----|
| **Supabase SQL Editor** | https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/sql |
| **Supabase Settings** | https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/settings |
| **Nylas Dashboard** | https://dashboard.nylas.com |
| **ProSpaces CRM** | https://pro-spaces.vercel.app/ |
| **Your GitHub Repo** | https://github.com/YOUR_USERNAME/YOUR_REPO |
| **GitHub Codespaces** | https://github.com/codespaces |

---

## 🎯 The 5-Step Process

```
1. SQL → 2. Nylas → 3. Codespace → 4. Deploy → 5. Test
  2min      10min       5min          15min      5min
```

### 1️⃣ SQL Migration (2 min)
- Supabase SQL Editor → New Query
- Paste `/RUN_EMAIL_MIGRATION_COMPLETE.sql`
- Run
- Verify: See "Tables Created"

### 2️⃣ Nylas Setup (10 min)
- Sign up at https://dashboard.nylas.com
- Create app: "ProSpaces CRM"
- Copy API Key (starts with `nyk_v0_`)
- Enable Google & Microsoft integrations
- Add redirect: `https://api.us.nylas.com/v3/connect/callback`

### 3️⃣ Open Codespace (5 min)
- GitHub repo → Code → Codespaces → Create
- Open Terminal
- Install CLI: `npm install -g supabase`
- Login: `supabase login`

### 4️⃣ Deploy Functions (15 min)
- Set secret: `supabase secrets set NYLAS_API_KEY=your_key`
- Link: `supabase link --project-ref usorqldwroecyxucmtuw`
- Deploy: `supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event`
- Verify: `supabase functions list`
- Add redirect in Nylas: `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback`

### 5️⃣ Test OAuth (5 min)
- ProSpaces CRM → Email → Add Account
- Select OAuth tab
- Click "Connect Gmail" or "Connect Outlook"
- Should redirect to OAuth (no error!)
- Complete flow → Success! 🎉

---

## ⚠️ Common Errors & Fixes

| Error | Fix |
|-------|-----|
| "Command not found: supabase" | `npm install -g supabase` |
| "Permission denied" | `supabase login` again |
| "Invalid database password" | Reset in Supabase Dashboard → Settings → Database |
| "NYLAS_API_KEY not found" | `supabase secrets set NYLAS_API_KEY=your_key` |
| "Invalid redirect URI" | Check exact URL in Nylas Dashboard settings |
| "Function not found" | Verify: `supabase functions list` |
| Still see old error | Hard refresh: Ctrl+Shift+R |

---

## 📝 Critical Information

**Project Reference:** `usorqldwroecyxucmtuw`

**Nylas API Key:** (save yours here) `____________________________`

**Database Password:** (save yours here) `____________________________`

**Function URL Base:** 
```
https://usorqldwroecyxucmtuw.supabase.co/functions/v1/
```

**Nylas Redirect URI:**
```
https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback
```

**Nylas OAuth Callback (for OAuth setup):**
```
https://api.us.nylas.com/v3/connect/callback
```

---

## ✅ Deployment Checklist

- [ ] SQL migration ran successfully
- [ ] Nylas account created
- [ ] Nylas API key copied
- [ ] Google integration enabled in Nylas
- [ ] Microsoft integration enabled in Nylas
- [ ] Codespace opened
- [ ] Supabase CLI installed
- [ ] Logged in to Supabase CLI
- [ ] Secret set (NYLAS_API_KEY)
- [ ] Project linked
- [ ] All 7 functions deployed
- [ ] Functions listed correctly
- [ ] Redirect URI added to Nylas
- [ ] Gmail OAuth tested
- [ ] Outlook OAuth tested

---

## 🔍 Verification Commands

```bash
# Are you in the right directory?
pwd
# Should show: /workspaces/YOUR_REPO_NAME

# Are functions deployed?
supabase functions list
# Should list 7 functions

# Is secret set?
supabase secrets list
# Should show: NYLAS_API_KEY

# Are files present?
ls supabase/functions/
# Should show: nylas-connect, nylas-callback, etc.

# Check function logs
supabase functions logs nylas-connect --tail
# Should show log output (or waiting for requests)
```

---

## 🎯 Success Indicators

✅ **You're done when:**
1. `supabase functions list` shows 7 functions
2. Click "Connect Gmail" - no error message
3. Redirects to Nylas OAuth page
4. After OAuth, returns to ProSpaces
5. Shows "Email account connected successfully!"

---

## 📚 Full Documentation

| File | Purpose |
|------|---------|
| `/START_HERE_OAUTH_DEPLOYMENT.md` | Overview & orientation |
| `/DEPLOY_OAUTH_NOW.md` | Complete step-by-step guide |
| `/OAUTH_DEPLOYMENT_CHECKLIST.md` | Printable checklist |
| `/OAUTH_TROUBLESHOOTING.md` | Problem solutions |
| This file | Quick reference card |

---

## 🆘 Need Help?

**Stuck on a specific step?**
1. Check `/OAUTH_TROUBLESHOOTING.md` for your error
2. Review the step in `/DEPLOY_OAUTH_NOW.md`
3. Share error message + which step you're on

**Common questions:**
- "Where do I run these commands?" → GitHub Codespace terminal
- "What's my database password?" → Reset it in Supabase Dashboard
- "Which API key?" → Nylas API Key (starts with `nyk_v0_`)
- "How long does this take?" → 30-40 minutes total

---

## 💡 Pro Tips

1. **Copy/paste commands exactly** - don't type them manually
2. **Wait for each command to complete** before running the next
3. **Keep this reference open** in a separate window
4. **Hard refresh ProSpaces** (Ctrl+Shift+R) after deploying
5. **Check function logs** if OAuth doesn't work
6. **Take breaks** - you don't have to do it all at once

---

## 🔄 Redeployment (Future Updates)

If you need to update functions later:

```bash
# Open Codespace again
# Link project
supabase link --project-ref usorqldwroecyxucmtuw

# Deploy specific function
supabase functions deploy nylas-connect

# Or deploy all
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

---

## 🎉 After Success

Once OAuth works:
- [ ] Close Codespace (don't need it anymore)
- [ ] Test with multiple email accounts
- [ ] Enable auto-sync for emails
- [ ] Configure calendar sync (similar process)
- [ ] Celebrate! 🎊

---

**Print this page or keep it open during deployment!** 📌

**Total time: ~30-40 minutes** ⏱️

**Difficulty: Medium** 🎯

**You've got this!** 💪
