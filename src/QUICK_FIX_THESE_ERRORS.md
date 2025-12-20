# ⚡ QUICK FIX - Both Errors Still Showing

## 📸 The Errors You're Seeing:

```
⚠️ OAuth Setup Required
⚠️ Unable to connect to email backend
```

---

## 🎯 THE PROBLEM:

You deployed Edge Functions ✅ **BUT** you haven't configured Nylas OAuth yet! ❌

**Both must be done!**

---

## ✅ DO THESE 3 THINGS RIGHT NOW:

### **1️⃣ Configure Microsoft in Nylas** (5 min) ⭐ **THIS IS THE KEY!**

1. **Go to:** https://dashboard.nylas.com
2. **Login** (or sign up if you don't have account)
3. **Create app** (if you don't have one):
   - Click "Create a New App"
   - Name: `ProSpaces CRM`
   - Click "Create"
4. **Click "Integrations"** (left sidebar)
5. **Find "Microsoft"** in the list
6. **Click "Configure"** next to Microsoft
7. **Choose "Use Nylas Hosted Auth"** ⭐ **EASIEST!**
8. **Click "Save"**
9. **Verify** Microsoft shows **"Connected"** status ✅

**This fixes the "OAuth Setup Required" error!**

---

### **2️⃣ Set Redirect URI in Nylas** (2 min)

Still in Nylas Dashboard:

1. Click your app name → **"Settings"**
2. Find **"Redirect URIs"** section
3. Click **"Add"**
4. Enter this EXACT URL:
   ```
   https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback
   ```
5. Click **"Save"**

---

### **3️⃣ Verify Edge Functions Deployed** (1 min)

**Check in Supabase Dashboard:**

1. **Go to:** https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/functions
2. **You should see 7 functions:**
   - nylas-connect
   - nylas-callback
   - nylas-send-email
   - nylas-sync-emails
   - nylas-webhook
   - nylas-sync-calendar
   - nylas-create-event

**Don't see all 7?**

Go back to Codespaces and run:
```bash
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

---

## 🧪 TEST NOW:

1. **Refresh ProSpaces CRM**
2. Click **"Email"** → **"Add Email Account"**
3. Select **"Microsoft Outlook"**
4. Click **"Connect Microsoft Outlook"**

**Expected:** Both errors gone! Redirects to Microsoft login! ✅

---

## 🎯 CHECKLIST:

- [ ] Microsoft configured in Nylas (shows "Connected")
- [ ] Redirect URI added in Nylas Settings
- [ ] 7 Edge Functions deployed to Supabase
- [ ] Nylas API key set: `supabase secrets set NYLAS_API_KEY=...`

**All 4 checked?** Both errors should be gone! 🎉

---

## 🔑 MOST COMMON ISSUE:

**People deploy Edge Functions but forget to configure Nylas OAuth!**

**You MUST do both:**
1. ✅ Deploy Edge Functions (backend)
2. ✅ Configure Nylas OAuth (authorization)

---

**Full guide:** `/CONFIGURE_NYLAS_OAUTH_NOW.md`

**Go to Nylas Dashboard NOW and enable Microsoft!** 🚀
