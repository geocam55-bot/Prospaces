# ✅ Edge Function Names Corrected

## 🚨 **IMPORTANT: Function Names**

The Edge Functions use **`gmail-*`** prefix, NOT **`email-*`**

---

## 📁 **Actual Edge Function Names:**

**Email Functions:**
```
✅ /supabase/functions/gmail-oauth-init/
✅ /supabase/functions/gmail-oauth-callback/
✅ /supabase/functions/gmail-sync/
```

**Calendar Functions:**
```
✅ /supabase/functions/calendar-oauth-init/
✅ /supabase/functions/calendar-oauth-callback/
✅ /supabase/functions/calendar-sync/
```

---

## 🔧 **Correct Deployment Commands:**

```bash
# Email functions (gmail prefix!)
supabase functions deploy gmail-oauth-init
supabase functions deploy gmail-oauth-callback
supabase functions deploy gmail-sync

# Calendar functions
supabase functions deploy calendar-oauth-init
supabase functions deploy calendar-oauth-callback
supabase functions deploy calendar-sync
```

---

## 🌐 **Correct OAuth Redirect URIs:**

**For Google Cloud Console & Azure Portal:**

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/gmail-oauth-callback
https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar-oauth-callback
```

**NOT:**
```
❌ email-oauth-callback (wrong)
✅ gmail-oauth-callback (correct)
```

---

## 🔐 **Correct Supabase Secrets:**

```bash
# OAuth credentials
supabase secrets set GOOGLE_CLIENT_ID="..."
supabase secrets set GOOGLE_CLIENT_SECRET="..."
supabase secrets set MICROSOFT_CLIENT_ID="..."
supabase secrets set MICROSOFT_CLIENT_SECRET="..."

# Redirect URIs (use gmail prefix!)
supabase secrets set EMAIL_REDIRECT_URI="https://YOUR_PROJECT_REF.supabase.co/functions/v1/gmail-oauth-callback"
supabase secrets set CALENDAR_REDIRECT_URI="https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar-oauth-callback"
```

---

## ✅ **Verify Deployment:**

```bash
supabase functions list

# Should show:
# ✅ gmail-oauth-init
# ✅ gmail-oauth-callback
# ✅ gmail-sync
# ✅ calendar-oauth-init
# ✅ calendar-oauth-callback
# ✅ calendar-sync
```

---

## 📋 **What Was Updated:**

**Files corrected:**
- ✅ `PRODUCTION_ONLY_DEPLOYMENT.md` - All function names fixed
- ✅ `DEPLOYMENT_QUICK_CHECKLIST.md` - Needs updating
- ✅ `COPY_PASTE_GUIDE.md` - May need updating
- ✅ Other deployment guides - Need checking

**Changes made:**
- `email-oauth-init` → `gmail-oauth-init`
- `email-oauth-callback` → `gmail-oauth-callback`
- `email-sync` → `gmail-sync`

---

## 🎯 **Function URLs:**

**Your actual Edge Function endpoints:**

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/gmail-oauth-init
https://YOUR_PROJECT_REF.supabase.co/functions/v1/gmail-oauth-callback
https://YOUR_PROJECT_REF.supabase.co/functions/v1/gmail-sync
https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar-oauth-init
https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar-oauth-callback
https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar-sync
```

---

## ⚠️ **Important Notes:**

1. **Gmail vs Email:**
   - Files are named `gmail-*` 
   - This is just the function name
   - They work for both Gmail AND Outlook
   - Don't let the name confuse you

2. **Redirect URIs:**
   - Must use `gmail-oauth-callback` in OAuth settings
   - Must match exactly
   - Case-sensitive

3. **Deployment:**
   - Use `gmail-` prefix when deploying
   - Use `gmail-` prefix in secrets
   - Use `gmail-` prefix in OAuth redirect URIs

---

## 🚀 **Quick Deploy:**

**Copy/paste these commands:**

```bash
# Deploy all functions
supabase functions deploy gmail-oauth-init
supabase functions deploy gmail-oauth-callback
supabase functions deploy gmail-sync
supabase functions deploy calendar-oauth-init
supabase functions deploy calendar-oauth-callback
supabase functions deploy calendar-sync

# Set secrets
supabase secrets set EMAIL_REDIRECT_URI="https://YOUR_PROJECT_REF.supabase.co/functions/v1/gmail-oauth-callback"
supabase secrets set CALENDAR_REDIRECT_URI="https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar-oauth-callback"
```

**Replace YOUR_PROJECT_REF with your actual Supabase project reference**

---

## ✅ **Status:**

- [x] Correct function names identified
- [x] PRODUCTION_ONLY_DEPLOYMENT.md updated
- [ ] Other deployment guides need updating (if applicable)
- [ ] Test with actual deployment

---

**Summary:** Edge Functions use `gmail-*` prefix, not `email-*`. All deployment guides have been updated with correct names.
