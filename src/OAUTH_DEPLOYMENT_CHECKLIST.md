# ✅ OAuth Deployment Checklist

Print this or keep it open while you work!

---

## 📋 STEP 1: Database Setup (2 min)

- [ ] Open Supabase SQL Editor
- [ ] Copy `/RUN_EMAIL_MIGRATION_COMPLETE.sql` (all 271 lines)
- [ ] Paste and click "Run"
- [ ] Verify: See "Tables Created" and "Policies Created"

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

---

## 📋 STEP 2: Nylas Account (10 min)

- [ ] Go to https://dashboard.nylas.com/register
- [ ] Sign up and verify email
- [ ] Create new app: "ProSpaces CRM"
- [ ] Copy API Key (looks like `nyk_v0_...`)
- [ ] Save API Key somewhere safe
- [ ] Click "Integrations" → Enable "Google"
- [ ] Click "Integrations" → Enable "Microsoft"
- [ ] Add redirect URI: `https://api.us.nylas.com/v3/connect/callback`

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**API Key Saved:** ________________________________

---

## 📋 STEP 3: GitHub Codespace (20 min)

### 3a. Open Codespace
- [ ] Go to your GitHub repository
- [ ] Click green "Code" button
- [ ] Click "Codespaces" tab
- [ ] Click "Create codespace on main"
- [ ] Wait for VS Code to load in browser

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

### 3b. Install & Login
- [ ] Open Terminal in Codespace
- [ ] Run: `npm install -g supabase`
- [ ] Run: `supabase --version` (verify it shows version)
- [ ] Run: `supabase login`
- [ ] Click the authorization URL
- [ ] Click "Authorize" in browser
- [ ] Verify: Terminal shows "Logged in successfully"

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

### 3c. Set Secret & Link Project
- [ ] Run: `supabase secrets set NYLAS_API_KEY=YOUR_KEY_HERE`
  - Replace `YOUR_KEY_HERE` with actual Nylas API key from Step 2
- [ ] Verify: See "Finished supabase secrets set"
- [ ] Run: `supabase link --project-ref usorqldwroecyxucmtuw`
- [ ] Enter database password when prompted
- [ ] Verify: See "Linked to project"

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

### 3d. Deploy Functions
- [ ] Run this command (one line):
  ```
  supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
  ```
- [ ] Wait 2-5 minutes
- [ ] Watch for 7 "Deployed" messages
- [ ] Run: `supabase functions list`
- [ ] Verify: See all 7 functions listed

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Functions Deployed:**
- [ ] nylas-connect
- [ ] nylas-callback
- [ ] nylas-send-email
- [ ] nylas-sync-emails
- [ ] nylas-webhook
- [ ] nylas-sync-calendar
- [ ] nylas-create-event

---

## 📋 STEP 4: Configure Redirect (2 min)

- [ ] Go back to Nylas Dashboard
- [ ] Click your app → "Settings"
- [ ] Find "Redirect URIs" section
- [ ] Add: `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback`
- [ ] Click "Save"

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

---

## 📋 STEP 5: Test OAuth (5 min)

### 5a. Test Microsoft Outlook
- [ ] Open ProSpaces CRM: https://pro-spaces.vercel.app/
- [ ] Login
- [ ] Click "Email" in sidebar
- [ ] Click "Add Email Account"
- [ ] Select "OAuth" tab
- [ ] Select "Microsoft Outlook"
- [ ] Click "Connect Microsoft Outlook"
- [ ] Verify: No error, redirects to Nylas
- [ ] Complete OAuth flow
- [ ] Verify: Returns to ProSpaces, shows "Connected successfully!"

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

### 5b. Test Gmail
- [ ] Click "Add Email Account" again
- [ ] Select "Gmail"
- [ ] Click "Connect Gmail"
- [ ] Verify: Redirects to Google OAuth
- [ ] Complete OAuth flow
- [ ] Verify: Returns to ProSpaces, shows "Connected successfully!"

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

---

## 🎉 Final Verification

- [ ] Both email accounts show in Email list
- [ ] No error messages
- [ ] Can see "Connected" status
- [ ] Can access email settings

**Overall Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

---

## 📝 Notes / Issues

Use this space to write down any problems you encounter:

```
Problem:




Solution:




```

---

## 🆘 Common Issues Quick Fix

| Problem | Quick Fix |
|---------|-----------|
| "Command not found: supabase" | Run `npm install -g supabase` again |
| "Permission denied" | Run `supabase login` again |
| "Function deployment failed" | Check you're in project root: `pwd` |
| "NYLAS_API_KEY not found" | Run `supabase secrets set` again |
| OAuth error page | Check redirect URI matches exactly |

---

## ⏱️ Time Tracking

Start Time: __________

- Step 1 completed: __________
- Step 2 completed: __________
- Step 3 completed: __________
- Step 4 completed: __________
- Step 5 completed: __________

End Time: __________

**Total Time:** __________

---

## ✅ Success!

When all boxes are checked, you have:
- ✅ Full OAuth support for Gmail and Microsoft Outlook
- ✅ One-click email connections for all users
- ✅ Automated email syncing
- ✅ Production-ready email integration

**Celebrate!** 🎉 You just deployed a complete OAuth system!

---

## 📦 Cleanup

After everything works:
- [ ] Close the GitHub Codespace tab (you won't need it)
- [ ] OAuth keeps working on Supabase Edge Functions
- [ ] No need to keep Codespace running

---

## 🔄 Need to Deploy Again?

If you update the Edge Functions later:
1. Open Codespace again
2. Run `supabase link --project-ref usorqldwroecyxucmtuw`
3. Run `supabase functions deploy FUNCTION_NAME`
4. Done!

---

**Keep this checklist for reference!** 📌
