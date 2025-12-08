# ⚡ Quick Deployment Checklist (PRODUCTION ONLY)

## 🎯 Fast Track: Get Email & Calendar Live with Real OAuth

**Prerequisites:** Figma Make files ready, GitHub access, Supabase access, OAuth credentials

---

## ⚠️ PRODUCTION MODE - NO MOCK FILES

This guide deploys **PRODUCTION-READY code ONLY** with real OAuth integration.

**Mock files removed:** ❌ No fallback, no demo mode
**OAuth required:** ✅ Must set up before deployment

---

## ✅ 5-STEP PRODUCTION DEPLOYMENT

### **STEP 1: OAuth Setup (60 min)**

**MUST DO FIRST - Required for functionality**

#### **Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project or select existing
3. Enable APIs: Gmail, Google Calendar, Google People
4. Create OAuth 2.0 credentials
5. Add redirect URIs:
   - `https://YOUR_PROJECT_REF.supabase.co/functions/v1/email-oauth-callback`
   - `https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar-oauth-callback`
6. Copy Client ID and Client Secret
7. Save for later

#### **Microsoft OAuth:**
1. Go to [Azure Portal](https://portal.azure.com)
2. App registrations → New registration
3. Add redirect URIs (same as Google)
4. API Permissions: Mail.Read, Mail.ReadWrite, Calendars.Read, Calendars.ReadWrite
5. Create client secret
6. Copy Application ID and Client Secret
7. Save for later

**Time: 60 minutes**

---

### **STEP 2: Database (10 min)**

**Run in Supabase SQL Editor:**

```sql
-- Email tables
CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  email TEXT NOT NULL,
  connected BOOLEAN DEFAULT true,
  access_token TEXT,
  refresh_token TEXT,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own email accounts" ON email_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_email_accounts_user ON email_accounts(user_id);
CREATE INDEX idx_email_accounts_org ON email_accounts(organization_id);

-- Email sync log
CREATE TABLE IF NOT EXISTS email_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  sync_direction TEXT CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
  emails_imported INTEGER DEFAULT 0,
  emails_exported INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own email sync logs" ON email_sync_log
  FOR SELECT USING (
    account_id IN (SELECT id FROM email_accounts WHERE user_id = auth.uid())
  );

-- Calendar tables
CREATE TABLE IF NOT EXISTS calendar_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
  email TEXT NOT NULL,
  connected BOOLEAN DEFAULT true,
  access_token TEXT,
  refresh_token TEXT,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

ALTER TABLE calendar_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own calendar accounts" ON calendar_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_calendar_accounts_user ON calendar_accounts(user_id);
CREATE INDEX idx_calendar_accounts_org ON calendar_accounts(organization_id);

-- Calendar sync log
CREATE TABLE IF NOT EXISTS calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES calendar_accounts(id) ON DELETE CASCADE,
  sync_direction TEXT CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
  events_imported INTEGER DEFAULT 0,
  events_exported INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE calendar_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own calendar sync logs" ON calendar_sync_log
  FOR SELECT USING (
    account_id IN (SELECT id FROM calendar_accounts WHERE user_id = auth.uid())
  );

-- Add to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS calendar_account_id UUID 
  REFERENCES calendar_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_external_id ON appointments(external_id);
CREATE INDEX IF NOT EXISTS idx_appointments_calendar_account ON appointments(calendar_account_id);

-- Add to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE INDEX IF NOT EXISTS idx_contacts_external_id ON contacts(external_id);
```

**Time: 10 minutes**

---

### **STEP 3: Deploy Edge Functions (20 min)**

**Prerequisites:**
- Supabase CLI installed: `npm install -g supabase`
- Logged in: `supabase login`
- Linked: `supabase link --project-ref YOUR_PROJECT_REF`

**Deploy commands:**

```bash
# Deploy all functions
supabase functions deploy email-oauth-init
supabase functions deploy email-oauth-callback
supabase functions deploy email-sync
supabase functions deploy calendar-oauth-init
supabase functions deploy calendar-oauth-callback
supabase functions deploy calendar-sync
```

**Set secrets:**

```bash
supabase secrets set GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
supabase secrets set GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
supabase secrets set MICROSOFT_CLIENT_ID="YOUR_MICROSOFT_CLIENT_ID"
supabase secrets set MICROSOFT_CLIENT_SECRET="YOUR_MICROSOFT_CLIENT_SECRET"
supabase secrets set EMAIL_REDIRECT_URI="https://YOUR_PROJECT_REF.supabase.co/functions/v1/email-oauth-callback"
supabase secrets set CALENDAR_REDIRECT_URI="https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar-oauth-callback"
```

**Verify:**

```bash
supabase functions list
# Should show all 6 functions deployed ✅
```

**Time: 20 minutes**

---

### **STEP 4: Deploy Frontend (15 min)**

**Upload/Update these files to GitHub:**

#### **New Files:**
```
✅ /components/Emails.tsx
✅ /components/CalendarAccountSetup.tsx
```

#### **Update Existing:**
```
✅ /utils/api.ts              [Add emailsAPI]
✅ /components/Appointments.tsx [Replace with new version]
✅ /App.tsx                    [Add Emails route]
```

#### **DO NOT UPLOAD:**
```
❌ /utils/emailSyncMock.ts     [Not needed - production only]
❌ /utils/calendarSyncMock.ts  [Not needed - production only]
```

**See:** `COPY_PASTE_GUIDE.md` for exact copy/paste instructions

**Time: 15 minutes**

---

### **STEP 5: Test Real OAuth (10 min)**

#### **Test Email OAuth:**
1. Navigate to Emails
2. Click "Connect Email"
3. Choose Gmail
4. Click "Connect Email"
5. **Should redirect to Google login** ✅
6. Authorize app
7. **Should redirect back to app** ✅
8. Email account appears ✅

#### **Test Calendar OAuth:**
1. Navigate to Appointments
2. Click "Connect Calendar"
3. Choose Google Calendar
4. Click "Connect Calendar"
5. **Should redirect to Google login** ✅
6. Authorize app
7. **Should redirect back to app** ✅
8. Calendar appears in "Manage Calendars" ✅

#### **Test Calendar Sync:**
1. Click "Sync" button
2. **Imports real events from Google Calendar** ✅
3. Events appear in Appointments list ✅

**Time: 10 minutes**

---

## 📋 File Upload Order

**Copy from Figma Make to GitHub in this order:**

### **Round 1: Utilities**
```
1. /utils/api.ts                    [Edit - Add emailsAPI]
```

### **Round 2: Components**
```
2. /components/Emails.tsx           [New file]
3. /components/CalendarAccountSetup.tsx [New file or replace]
```

### **Round 3: Updates**
```
4. /App.tsx                         [Edit - Add Emails route]
5. /components/Appointments.tsx     [Replace]
```

---

## 🎨 CSS PROTECTION

### **⚠️ DO NOT TOUCH THESE FILES:**

```
❌ /styles/globals.css        [DO NOT MODIFY]
❌ /tailwind.config.cjs       [DO NOT MODIFY]
❌ /postcss.config.cjs        [DO NOT MODIFY]
```

**Why?** Email & Calendar modules don't need CSS changes. Your existing CSS works perfectly.

---

## ✅ Success Indicators

**You're done when:**

✅ "Emails" tab appears in navigation
✅ Clicking "Connect Email" redirects to Google/Microsoft
✅ After OAuth, redirects back to app
✅ Email account appears in list
✅ "Manage Calendars" button shows in Appointments
✅ Clicking "Connect Calendar" redirects to Google/Microsoft
✅ After OAuth, calendar appears in list
✅ Clicking "Sync" imports REAL calendar events
✅ All existing features still work
✅ **NO "demo mode" messages**

---

## 🚨 What Happens Without Edge Functions?

**If you deploy frontend WITHOUT Edge Functions:**

```
User clicks "Connect Calendar"
→ ❌ Error: "Failed to initialize OAuth. 
            Please ensure Edge Functions are deployed."
→ Feature doesn't work (expected)
```

**Solution:** Deploy Edge Functions (Step 3)

---

## 🆘 Emergency Rollback

**If something breaks:**

1. Revert App.tsx (GitHub → History → Previous version)
2. Revert Appointments.tsx (GitHub → History → Previous version)
3. Delete new component files if needed
4. App returns to normal ✅

**Edge Functions can stay deployed** - they won't affect anything if frontend isn't calling them.

---

## 🎯 Time Breakdown

- OAuth setup: **60 min** (one-time)
- Database setup: **10 min**
- Edge Functions: **20 min**
- Frontend files: **15 min**
- Testing: **10 min**

**Total: 115 minutes** (~2 hours)

---

## 🚦 Go/No-Go Decision

**✅ SAFE TO PROCEED if:**
- OAuth credentials ready (Google + Microsoft)
- You have Supabase CLI access
- You can edit files in GitHub web
- You have backups of App.tsx and Appointments.tsx
- You have 2 hours available
- It's a low-traffic time

**❌ WAIT if:**
- Don't have OAuth credentials yet
- Can't install Supabase CLI
- Peak business hours
- Don't have database access

---

## 🎁 What You Get

**After deployment:**
- ✅ Full email management UI
- ✅ **Real** Gmail/Outlook OAuth integration
- ✅ Calendar sync with appointments
- ✅ **Real** Google/Outlook calendar OAuth
- ✅ Two-way sync (CRM ↔ Calendar)
- ✅ Manage connected accounts
- ✅ **Production-ready with real APIs**
- ✅ All existing features intact

**No demo mode, no mock data - 100% production!**

---

## 📚 Related Guides

**For detailed steps:**
- `PRODUCTION_ONLY_DEPLOYMENT.md` - Complete deployment guide
- `COPY_PASTE_GUIDE.md` - Exact file copy instructions
- `PRODUCTION_READY_NO_MOCK.md` - What was removed/why
- `CALENDAR_OAUTH_PRODUCTION_SETUP.md` - Detailed OAuth setup

---

**Ready? Start with Step 1: OAuth Setup!** 🚀

**Status:** Production-Only
**Mock Files:** Not included
**OAuth:** Required
**Total Time:** ~2 hours
