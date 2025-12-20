# ✅ ACTION PLAN - Start Here

## 📸 You Showed Me This Screenshot:

Two errors:
1. ⚠️ **"OAuth Setup Required"** - Need to configure Azure AD / Nylas
2. ⚠️ **"Unable to connect to email backend"** - Edge Functions not deployed

---

## 🎯 HERE'S EXACTLY WHAT TO DO:

### **📖 Open This File: `/FIX_BOTH_OAUTH_ISSUES.md`**

That's your complete guide. It has 6 parts that fix BOTH errors.

---

## ⚡ ULTRA-QUICK SUMMARY:

### Part 1: SQL (2 min)
- Open Supabase SQL Editor
- Copy `/RUN_EMAIL_MIGRATION_COMPLETE.sql` 
- Paste and Run
- Done ✅

### Part 2: Nylas Account (15 min)
- Go to https://dashboard.nylas.com/register
- Sign up
- Create app: "ProSpaces CRM"
- Copy API key
- Done ✅

### Part 3: Microsoft OAuth (10 min)
- In Nylas Dashboard → Integrations
- Click "Microsoft" → "Configure"
- Choose "Use Nylas Hosted Auth" ← **EASIEST!**
- Click "Save"
- **✅ FIXES: "OAuth Setup Required" error**

### Part 4: Deploy Edge Functions (20 min)
- GitHub repo → Code → Codespaces → Create
- Open terminal
- Run these 5 commands:
```bash
npm install -g supabase
supabase login
supabase secrets set NYLAS_API_KEY=your_key
supabase link --project-ref usorqldwroecyxucmtuw
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```
- **✅ FIXES: "Unable to connect to email backend" error**

### Part 5: Verify (2 min)
- Nylas Dashboard → Settings → Redirect URIs
- Add: `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback`
- Save
- Done ✅

### Part 6: Test (5 min)
- ProSpaces CRM → Email → Add Account
- Click "Connect Microsoft Outlook"
- Should work! No errors! 🎉

---

## 📚 Files You Need:

| File | What It Does |
|------|-------------|
| **`/FIX_BOTH_OAUTH_ISSUES.md`** ⭐ | **MAIN GUIDE - Follow this!** |
| `/OAUTH_DEPLOYMENT_CHECKLIST.md` | Track your progress |
| `/OAUTH_QUICK_REFERENCE.md` | Commands cheat sheet |
| `/OAUTH_TROUBLESHOOTING.md` | If you get errors |
| `/YOUR_TWO_ERRORS_EXPLAINED.md` | Why the errors exist |

---

## ⏱️ Time Needed:

**Total:** 50-60 minutes

**Breakdown:**
- SQL: 2 min
- Nylas: 15 min
- Microsoft OAuth: 10 min
- Deploy: 20 min
- Verify: 2 min
- Test: 5 min

---

## 🎯 What Gets Fixed:

✅ **Error 1 Fixed** (Parts 2-3): "OAuth Setup Required" → Gone!  
✅ **Error 2 Fixed** (Part 4): "Unable to connect to email backend" → Gone!  
✅ **Result**: Microsoft Outlook OAuth works! 🎉

---

## 🚀 START NOW:

1. **Open:** `/FIX_BOTH_OAUTH_ISSUES.md`
2. **Follow:** Parts 1-6 in order
3. **Done:** OAuth works!

---

**That's it! Open the main guide and let's fix both errors! 🔧**
