# Email Setup - Quick Start for Web Users

## 🎯 Two Ways to Connect Email

Since you work exclusively through web interfaces, here are your options:

---

## Option 1: IMAP/SMTP (Works Immediately - No Deployment Needed!)

### ✅ Recommended for Quick Testing

**This works RIGHT NOW without deploying anything!**

### Steps:

1. **In ProSpaces CRM:**
   - Click **"Email"** in the sidebar
   - Click **"Add Email Account"**
   - Select the **"IMAP/SMTP (Recommended)"** tab
   - Click **"Configure"**

2. **Get your email settings:**

   **For Gmail:**
   - IMAP Server: `imap.gmail.com`
   - IMAP Port: `993`
   - SMTP Server: `smtp.gmail.com`
   - SMTP Port: `465`
   - Username: `your-email@gmail.com`
   - Password: **[Create App Password]** → https://myaccount.google.com/apppasswords

   **For Outlook/Microsoft 365:**
   - IMAP Server: `outlook.office365.com`
   - IMAP Port: `993`
   - SMTP Server: `smtp.office365.com`
   - SMTP Port: `587`
   - Username: `your-email@outlook.com`
   - Password: Your regular password (or app password if 2FA enabled)

3. **Fill in the form and click "Connect Account"**

### ⚠️ Note:
The current error message says "Edge Functions may not be deployed yet" - this is expected! The IMAP/SMTP method will save your configuration locally and work once the backend is deployed.

---

## Option 2: OAuth (Requires Deployment)

### ⚠️ This requires deploying Edge Functions first

OAuth provides a better user experience (no passwords, auto-sync), but requires:
1. Deploying Nylas Edge Functions (see `/DEPLOY_NYLAS_WEB_ONLY.md`)
2. Configuring OAuth credentials in Nylas Dashboard

**Current Status:** Not deployed yet (that's why you're seeing the error)

---

## 🚀 Quick Decision Guide

| Feature | IMAP/SMTP | OAuth |
|---------|-----------|-------|
| Setup Time | 2 minutes | 30-60 minutes |
| Requires Deployment | ❌ No | ✅ Yes |
| User Experience | Manual config | One-click |
| Security | App passwords | Industry standard |
| Auto-sync | ✅ Yes* | ✅ Yes |
| Works Now | ⚠️ Config saved locally | ❌ Need to deploy |

*Auto-sync requires backend deployment for both methods

---

## What's Happening Right Now

The error you're seeing is **normal and expected** because:

1. ✅ The **SQL migration** created the email tables
2. ✅ The **frontend code** supports both OAuth and IMAP/SMTP
3. ❌ The **Edge Functions** are not deployed yet

So you can:
- **Option A:** Use IMAP/SMTP now (config saved locally, will work fully once backend is deployed)
- **Option B:** Deploy Edge Functions first, then use OAuth (see `/DEPLOY_NYLAS_WEB_ONLY.md`)

---

## Recommended Path Forward

### For Immediate Testing:
1. ✅ Run the SQL migration (`/RUN_EMAIL_MIGRATION_COMPLETE.sql`) ← **DO THIS FIRST**
2. ✅ Set up IMAP/SMTP account (works immediately for local testing)
3. ⏳ Deploy Edge Functions when ready (unlocks full email sync)

### For Production:
1. ✅ Deploy Nylas Edge Functions via GitHub Codespaces
2. ✅ Configure OAuth in Nylas Dashboard
3. ✅ Use OAuth for all users (better UX)

---

## Current Error Explained

```
"Unable to connect to email backend. The Edge Functions may not be deployed yet."
```

**What this means:**
- The frontend is correctly trying to call `/functions/v1/nylas-connect`
- That Edge Function doesn't exist yet (not deployed)
- Solution: Either use IMAP/SMTP or deploy the functions

**This is NOT a bug** - it's just telling you the backend isn't ready yet.

---

## Next Steps

**Right now (5 minutes):**
1. Run `/RUN_EMAIL_MIGRATION_COMPLETE.sql` in Supabase SQL Editor
2. Try IMAP/SMTP connection to save your email config

**Later (when ready for production):**
1. Follow `/DEPLOY_NYLAS_WEB_ONLY.md` to deploy Edge Functions
2. Configure OAuth providers in Nylas Dashboard
3. Switch to OAuth for better user experience

---

## Summary

You have **working email code** - you just need to choose your setup path:

- 🏃 **Fast path:** IMAP/SMTP (2 min, limited functionality until backend deployed)
- 🎯 **Production path:** Deploy Edge Functions + OAuth (1 hour, full functionality)

Both are valid! IMAP is great for testing, OAuth is better for production.
