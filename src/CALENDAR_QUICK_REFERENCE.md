# 📅 Calendar Sync - Quick Reference Card

## 🚀 Deploy Edge Functions

### Mac/Linux:
```bash
chmod +x deploy-calendar-functions.sh
./deploy-calendar-functions.sh
```

### Windows:
```powershell
.\deploy-calendar-functions.ps1
```

---

## 🔑 Required Secrets (Supabase Dashboard)

```
GOOGLE_CLIENT_ID=...........apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...........
MICROSOFT_CLIENT_ID=...........
MICROSOFT_CLIENT_SECRET=...........
CALENDAR_REDIRECT_URI=https://pro-spaces.vercel.app/auth/callback
```

**Add at:** Supabase Dashboard → Edge Functions → Secrets

---

## 📋 OAuth Setup URLs

**Google:**
- Console: https://console.cloud.google.com/
- Redirect URI: `https://pro-spaces.vercel.app/auth/callback`
- Scopes: `calendar`, `calendar.events`

**Microsoft:**
- Portal: https://portal.azure.com/
- Redirect URI: `https://pro-spaces.vercel.app/auth/callback`
- Scopes: `Calendars.ReadWrite`, `offline_access`, `User.Read`

---

## ✅ Testing Checklist

- [ ] Google OAuth credentials created
- [ ] Microsoft OAuth credentials created
- [ ] Edge Functions deployed
- [ ] Secrets added to Supabase
- [ ] Test Google Calendar connection
- [ ] Test Outlook Calendar connection
- [ ] Test sync (bidirectional)

---

## 🔍 Verify Deployment

```sql
-- Check calendar accounts
SELECT * FROM calendar_accounts;

-- Check sync logs
SELECT * FROM calendar_sync_log ORDER BY created_at DESC LIMIT 5;

-- Check event mappings
SELECT * FROM calendar_event_mappings;
```

---

## 📖 Full Documentation

See **`CALENDAR_OAUTH_PRODUCTION_SETUP.md`** for complete setup guide.
