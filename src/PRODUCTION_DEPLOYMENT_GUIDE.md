# 🚀 Production Deployment Guide - Email & Calendar Sync

## ⚠️ CRITICAL: CSS Protection Strategy

**THE GOLDEN RULE:** Do NOT modify `/styles/globals.css` in production if you have custom styles!

### **CSS Safety Checklist:**

✅ **Before deploying, check your production `/styles/globals.css`:**
   - If it has custom colors, fonts, or spacing → **PRESERVE IT**
   - If it's default/starter CSS → Safe to overwrite

✅ **Safe deployment strategy:**
   1. Copy production `globals.css` to a backup file
   2. Deploy new files
   3. Manually merge CSS if needed (see CSS Merge Guide below)

✅ **Files that DON'T touch CSS (100% safe):**
   - All API utilities (`/utils/api.ts`, `/utils/supabase/`)
   - All new components (Email, Calendar)
   - Database migrations
   - Edge Functions

---

## 📋 Deployment Checklist Overview

### **Phase 1: Preparation (10 min)**
- [ ] Review CSS protection strategy
- [ ] Backup current production files
- [ ] Review file changes

### **Phase 2: Database Setup (15 min)**
- [ ] Create email & calendar tables
- [ ] Set up RLS policies
- [ ] Verify permissions

### **Phase 3: Frontend Deployment (20 min)**
- [ ] Deploy new utility files
- [ ] Deploy new components
- [ ] Update existing components
- [ ] Handle CSS carefully

### **Phase 4: Backend Setup (30 min)**
- [ ] Deploy Edge Functions
- [ ] Configure OAuth credentials
- [ ] Add Supabase secrets

### **Phase 5: Testing (15 min)**
- [ ] Verify email module
- [ ] Test calendar sync
- [ ] Check existing modules

**Total Time:** ~90 minutes

---

## 📁 COMPLETE FILE LIST

### **✅ NEW FILES (Safe to add - no conflicts)**

#### **Email Module:**
```
/components/Emails.tsx                          [NEW - Email UI]
/utils/emailSyncMock.ts                         [NEW - Mock email sync]
/supabase/functions/email-oauth-init/index.ts   [NEW - Edge Function]
/supabase/functions/email-oauth-callback/index.ts [NEW - Edge Function]
/supabase/functions/email-sync/index.ts          [NEW - Edge Function]
```

#### **Calendar Module:**
```
/components/CalendarAccountSetup.tsx            [NEW - Calendar setup dialog]
/utils/calendarSyncMock.ts                      [NEW - Mock calendar sync]
/supabase/functions/calendar-oauth-init/index.ts [NEW - Edge Function]
/supabase/functions/calendar-oauth-callback/index.ts [NEW - Edge Function]
/supabase/functions/calendar-sync/index.ts      [NEW - Edge Function]
```

#### **Documentation:**
```
/EMAIL_MODULE_COMPLETE.md                       [NEW - Email docs]
/CALENDAR_SYNC_COMPLETE.md                      [NEW - Calendar docs]
/CALENDAR_OAUTH_PRODUCTION_SETUP.md             [NEW - OAuth setup]
/EMAIL_OAUTH_PRODUCTION_SETUP.md                [NEW - OAuth setup]
/MANAGE_CALENDARS_FEATURE.md                    [NEW - Feature docs]
/CALENDAR_ERROR_FIXED.md                        [NEW - Error fix docs]
/deploy-calendar-functions.sh                   [NEW - Deployment script]
/deploy-email-functions.sh                      [NEW - Deployment script]
```

---

### **⚠️ MODIFIED FILES (Review carefully)**

#### **Updated Components:**
```
/components/Appointments.tsx                    [MODIFIED - Added calendar sync]
/App.tsx                                        [MODIFIED - Added Emails route]
```

#### **Updated Utilities:**
```
/utils/api.ts                                   [MODIFIED - Added email API]
/utils/supabase/client.ts                       [MAY BE MODIFIED - Check if exists]
```

#### **⚠️ CSS FILE (PROTECT THIS!):**
```
/styles/globals.css                             [CHECK BEFORE OVERWRITING!]
```

---

## 🛡️ CSS PROTECTION - DETAILED GUIDE

### **Step 1: Check Your Production CSS**

**Option A: Production has default CSS**
```css
/* If your production globals.css looks like this (basic/default): */
@tailwind base;
@tailwind components;
@tailwind utilities;
/* Minimal custom styles */
```
→ **SAFE to overwrite** with new version

**Option B: Production has custom CSS**
```css
/* If your production has custom branding: */
:root {
  --brand-primary: #YOUR_COLOR;
  --custom-spacing: 20px;
}
/* Custom typography, colors, spacing */
```
→ **MUST PRESERVE** - Use merge strategy below

---

### **Step 2: CSS Merge Strategy**

**If you need to preserve custom CSS:**

1. **Download current production `/styles/globals.css`**
2. **Save as `globals-production-backup.css`**
3. **Compare with new version**
4. **Keep your custom:**
   - Color variables
   - Font settings
   - Spacing/sizing
   - Custom classes

5. **Add from new version (if missing):**
   ```css
   /* Only these sections are new for email/calendar: */
   /* (Actually, email/calendar don't require CSS changes!) */
   ```

**GOOD NEWS:** Email and Calendar modules use only Tailwind classes - they don't require changes to `globals.css`!

---

### **Step 3: Safe CSS Deployment**

```bash
# Strategy 1: Keep your production CSS (RECOMMENDED)
# - Don't touch globals.css at all
# - Email/Calendar work with your existing styles

# Strategy 2: If you need new typography defaults
# - Manually merge custom variables into new version
# - Test in staging first
```

---

## 🗄️ DATABASE MIGRATIONS

### **Migration 1: Email Tables**

Run this in Supabase SQL Editor:

```sql
-- =============================================
-- EMAIL ACCOUNTS TABLE
-- =============================================
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

-- Enable RLS
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own email accounts"
  ON email_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email accounts"
  ON email_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email accounts"
  ON email_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email accounts"
  ON email_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_email_accounts_user ON email_accounts(user_id);
CREATE INDEX idx_email_accounts_org ON email_accounts(organization_id);

-- =============================================
-- EMAIL SYNC LOG TABLE
-- =============================================
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

-- Enable RLS
ALTER TABLE email_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view their email sync logs"
  ON email_sync_log FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM email_accounts WHERE user_id = auth.uid()
    )
  );

-- Index
CREATE INDEX idx_email_sync_log_account ON email_sync_log(account_id);
CREATE INDEX idx_email_sync_log_created ON email_sync_log(created_at DESC);

-- =============================================
-- ADD EXTERNAL_ID TO CONTACTS (for email sync)
-- =============================================
-- Check if column exists first
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE contacts ADD COLUMN external_id TEXT;
    CREATE INDEX idx_contacts_external_id ON contacts(external_id);
  END IF;
END $$;

COMMENT ON COLUMN contacts.external_id IS 'External ID from email provider (for contact sync)';
```

---

### **Migration 2: Calendar Tables**

Run this in Supabase SQL Editor:

```sql
-- =============================================
-- CALENDAR ACCOUNTS TABLE
-- =============================================
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

-- Enable RLS
ALTER TABLE calendar_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own calendar accounts"
  ON calendar_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar accounts"
  ON calendar_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar accounts"
  ON calendar_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar accounts"
  ON calendar_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_calendar_accounts_user ON calendar_accounts(user_id);
CREATE INDEX idx_calendar_accounts_org ON calendar_accounts(organization_id);

-- =============================================
-- CALENDAR SYNC LOG TABLE
-- =============================================
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

-- Enable RLS
ALTER TABLE calendar_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view their calendar sync logs"
  ON calendar_sync_log FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM calendar_accounts WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_calendar_sync_log_account ON calendar_sync_log(account_id);
CREATE INDEX idx_calendar_sync_log_created ON calendar_sync_log(created_at DESC);

-- =============================================
-- ADD EXTERNAL_ID TO APPOINTMENTS (for calendar sync)
-- =============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN external_id TEXT;
    CREATE INDEX idx_appointments_external_id ON appointments(external_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'calendar_account_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN calendar_account_id UUID REFERENCES calendar_accounts(id) ON DELETE SET NULL;
    CREATE INDEX idx_appointments_calendar_account ON appointments(calendar_account_id);
  END IF;
END $$;

COMMENT ON COLUMN appointments.external_id IS 'External event ID from calendar provider';
COMMENT ON COLUMN appointments.calendar_account_id IS 'Calendar account this event syncs with';
```

---

### **Verify Database Setup:**

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'email_accounts', 'email_sync_log',
  'calendar_accounts', 'calendar_sync_log'
);

-- Should return 4 rows

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('email_accounts', 'calendar_accounts');

-- Both should show rowsecurity = true
```

---

## 📦 FRONTEND DEPLOYMENT

### **Step 1: Deploy Utilities (100% Safe)**

These files have NO CSS impact:

```
✅ /utils/api.ts                    [Add email APIs]
✅ /utils/emailSyncMock.ts           [New file]
✅ /utils/calendarSyncMock.ts        [New file]
✅ /utils/supabase/client.ts         [Supabase client - check if exists]
```

**How to deploy via GitHub:**
1. Create/update each file in GitHub web interface
2. Copy exact content from Figma Make
3. Commit with message: "Add email/calendar utilities"

---

### **Step 2: Deploy New Components (100% Safe)**

These are brand new files - no conflicts:

```
✅ /components/Emails.tsx
✅ /components/CalendarAccountSetup.tsx
```

**How to deploy:**
1. Create new files in `/components/` folder
2. Copy exact content
3. Commit: "Add Email and Calendar components"

---

### **Step 3: Update Existing Components (CAREFUL)**

These files exist in production - review changes:

#### **A. Update `/App.tsx`**

**Changes needed:**
- Import Emails component
- Add Emails route
- Add email icon to navigation

**How to deploy:**
1. Open production `/App.tsx` in GitHub
2. Find the imports section
3. Add: `import { Emails } from './components/Emails';`
4. Find the routes section
5. Add email route (see detailed diff below)
6. Find navigation items
7. Add email nav item

**DETAILED DIFF for `/App.tsx`:**

```tsx
// 1. ADD TO IMPORTS (around line 10)
import { Emails } from './components/Emails';

// 2. ADD TO NAVIGATION ITEMS (around line 50)
const navigationItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: 'dashboard' },
  { name: 'Contacts', icon: Users, path: 'contacts' },
  { name: 'Tasks', icon: CheckSquare, path: 'tasks' },
  { name: 'Notes', icon: FileText, path: 'notes' },
  { name: 'Bids', icon: DollarSign, path: 'bids' },
  { name: 'Appointments', icon: Calendar, path: 'appointments' },
  { name: 'Emails', icon: Mail, path: 'emails' },  // ← ADD THIS
  { name: 'Files', icon: FolderOpen, path: 'files' },
  // ... rest of items
];

// 3. ADD TO ROUTE RENDERING (around line 180)
{activeTab === 'appointments' && <Appointments user={user} />}
{activeTab === 'emails' && <Emails user={user} />}  // ← ADD THIS
{activeTab === 'files' && <Files user={user} />}
```

**Commit:** "Add Emails module to navigation and routing"

---

#### **B. Update `/components/Appointments.tsx`**

**Changes needed:**
- Import CalendarAccountSetup
- Add calendar sync state
- Add calendar management UI
- Add sync functionality

**SAFETY CHECK:** This file doesn't touch CSS at all!

**How to deploy:**
1. Download production version as backup
2. Replace with new version from Figma Make
3. Review diff to ensure no custom logic is lost
4. Commit: "Add calendar sync to Appointments"

**Key additions:**
- Calendar account state
- Sync button
- Manage Calendars button
- CalendarAccountSetup dialog
- OAuth callback handling

---

### **Step 4: CSS Deployment (CRITICAL)**

#### **⚠️ DO NOT BLINDLY OVERWRITE `/styles/globals.css`**

**SAFE APPROACH:**

1. **Check if email/calendar need CSS changes:**
   ```
   Answer: NO! They use only Tailwind utility classes.
   ```

2. **Keep your production `globals.css` unchanged**
   ```
   Your existing CSS is fine. No changes needed.
   ```

3. **If you want new typography defaults (optional):**
   - Manually review changes in new `globals.css`
   - Only add if you want default font sizes/weights
   - Test in staging first

**RECOMMENDATION:** 
✅ **Skip `globals.css` deployment** - your current CSS works fine!

---

## 🚀 EDGE FUNCTIONS DEPLOYMENT

### **Option 1: Demo Mode (Deploy Frontend Only)**

**What you get:**
- Full email/calendar UI works
- Mock sync with sample data
- No OAuth required
- Perfect for testing

**Steps:**
1. Deploy frontend only (above steps)
2. Skip Edge Functions
3. System automatically uses demo mode

---

### **Option 2: Production Mode (Full OAuth)**

**Prerequisites:**
- Supabase CLI installed
- OAuth credentials (Google + Microsoft)

#### **A. Deploy Calendar Edge Functions**

```bash
# Navigate to your project
cd your-project

# Deploy calendar functions
supabase functions deploy calendar-oauth-init
supabase functions deploy calendar-oauth-callback
supabase functions deploy calendar-sync

# Set secrets
supabase secrets set GOOGLE_CLIENT_ID="your_google_client_id"
supabase secrets set GOOGLE_CLIENT_SECRET="your_google_client_secret"
supabase secrets set MICROSOFT_CLIENT_ID="your_microsoft_client_id"
supabase secrets set MICROSOFT_CLIENT_SECRET="your_microsoft_client_secret"
supabase secrets set CALENDAR_REDIRECT_URI="https://YOUR_PROJECT.supabase.co/functions/v1/calendar-oauth-callback"
```

#### **B. Deploy Email Edge Functions**

```bash
# Deploy email functions
supabase functions deploy email-oauth-init
supabase functions deploy email-oauth-callback
supabase functions deploy email-sync

# Set secrets (same credentials as calendar)
supabase secrets set EMAIL_REDIRECT_URI="https://YOUR_PROJECT.supabase.co/functions/v1/email-oauth-callback"
```

#### **C. Get OAuth Credentials**

See detailed guides:
- `/CALENDAR_OAUTH_PRODUCTION_SETUP.md`
- `/EMAIL_OAUTH_PRODUCTION_SETUP.md`

**Quick overview:**
1. Google Cloud Console → Create OAuth 2.0 credentials (15 min)
2. Azure Portal → Register app for Microsoft (15 min)
3. Add redirect URIs to both platforms
4. Copy client IDs and secrets to Supabase

---

## ✅ DEPLOYMENT SEQUENCE (Recommended)

### **Phase 1: Database (Do First)**
```
1. Run email table migrations
2. Run calendar table migrations
3. Verify with test queries
4. Check RLS policies work

Time: 15 minutes
Risk: Low (just adding tables)
```

### **Phase 2: Utilities (Safe)**
```
1. Deploy /utils/api.ts
2. Deploy /utils/emailSyncMock.ts
3. Deploy /utils/calendarSyncMock.ts

Time: 5 minutes
Risk: None (new files or safe additions)
```

### **Phase 3: Components (Safe)**
```
1. Deploy /components/Emails.tsx
2. Deploy /components/CalendarAccountSetup.tsx

Time: 5 minutes
Risk: None (new files)
```

### **Phase 4: App Updates (Careful)**
```
1. Backup production /App.tsx
2. Add Emails import + route
3. Test navigation works

Time: 10 minutes
Risk: Low (small additions to existing file)
```

### **Phase 5: Appointments Update (Careful)**
```
1. Backup production /components/Appointments.tsx
2. Deploy updated version with calendar sync
3. Verify appointments still load

Time: 10 minutes
Risk: Low (replacing whole file, but tested)
```

### **Phase 6: Edge Functions (Optional - Production OAuth)**
```
1. Set up OAuth credentials
2. Deploy Edge Functions
3. Add Supabase secrets

Time: 60 minutes
Risk: Medium (requires OAuth setup)
Status: OPTIONAL - works in demo mode without this
```

---

## 🧪 TESTING CHECKLIST

### **After Database Migration:**
```sql
-- Test: Can create email account
INSERT INTO email_accounts (user_id, organization_id, provider, email)
VALUES (auth.uid(), 'YOUR_ORG_ID', 'gmail', 'test@example.com');

-- Test: Can read it back
SELECT * FROM email_accounts WHERE user_id = auth.uid();

-- Cleanup
DELETE FROM email_accounts WHERE email = 'test@example.com';
```

### **After Frontend Deployment:**
- [ ] App loads without errors
- [ ] Navigation shows "Emails" item
- [ ] Can navigate to Emails module
- [ ] Can navigate to Appointments
- [ ] Existing modules still work (Contacts, Tasks, etc.)
- [ ] CSS looks correct (no broken styles)

### **Email Module:**
- [ ] Click "Connect Email"
- [ ] See Gmail/Outlook options
- [ ] Can enter email address
- [ ] See demo mode notification
- [ ] Email account appears in list
- [ ] Can disconnect email
- [ ] Can reconnect email

### **Calendar Module:**
- [ ] Go to Appointments
- [ ] Click "Connect Calendar"
- [ ] See Google/Outlook options
- [ ] Can enter email address
- [ ] See demo mode notification
- [ ] Calendar appears in "Manage Calendars"
- [ ] Click "Sync" - see mock events imported
- [ ] Can delete calendar
- [ ] Can reconnect calendar

### **Existing Features (Don't Break These!):**
- [ ] Dashboard loads
- [ ] Contacts CRUD works
- [ ] Tasks CRUD works
- [ ] Appointments CRUD works (without sync)
- [ ] All existing CSS intact
- [ ] No console errors

---

## 🚨 ROLLBACK PLAN

If something breaks:

### **Immediate Rollback:**
```
1. Revert /App.tsx to backup
2. Revert /components/Appointments.tsx to backup
3. System returns to pre-deployment state
```

### **Database Rollback:**
```sql
-- Remove new tables (only if needed)
DROP TABLE IF EXISTS email_sync_log CASCADE;
DROP TABLE IF EXISTS email_accounts CASCADE;
DROP TABLE IF EXISTS calendar_sync_log CASCADE;
DROP TABLE IF EXISTS calendar_accounts CASCADE;

-- Remove added columns (only if needed)
ALTER TABLE contacts DROP COLUMN IF EXISTS external_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS external_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS calendar_account_id;
```

### **Partial Deployment:**
You can deploy in stages:
- ✅ Deploy email module only
- ✅ Deploy calendar module only
- ✅ Deploy database only (no frontend)
- ✅ Deploy frontend only (demo mode)

---

## 📊 RISK ASSESSMENT

| Component | Risk Level | Impact if Broken | Rollback Ease |
|-----------|-----------|------------------|---------------|
| Database migrations | 🟢 Low | New features only | Easy (DROP tables) |
| New utilities | 🟢 Low | None (not used yet) | Easy (delete files) |
| New components | 🟢 Low | New features only | Easy (delete files) |
| App.tsx update | 🟡 Medium | Navigation breaks | Easy (revert file) |
| Appointments update | 🟡 Medium | Appointments view breaks | Easy (revert file) |
| globals.css | 🔴 HIGH | Site-wide styling breaks | Easy (revert file) |
| Edge Functions | 🟢 Low | Falls back to demo mode | N/A (optional) |

---

## 🎯 RECOMMENDED APPROACH

### **Weekend Deployment (Safest):**

**Saturday Morning:**
1. Deploy database migrations
2. Test database with SQL queries
3. Deploy utilities + new components
4. Deploy App.tsx updates
5. Test email module (demo mode)

**Saturday Afternoon:**
6. Deploy Appointments.tsx updates
7. Test calendar sync (demo mode)
8. Full regression testing
9. Leave running over weekend

**Sunday:**
10. Monitor for issues
11. Test from different accounts
12. Verify production stability

**Monday (Optional):**
13. Set up OAuth credentials
14. Deploy Edge Functions
15. Switch to production mode

---

## 📝 DEPLOYMENT COMMAND LOG

Track your deployment:

```
✅ 2025-01-XX 10:00 - Created email_accounts table
✅ 2025-01-XX 10:05 - Created calendar_accounts table
✅ 2025-01-XX 10:10 - Verified RLS policies
✅ 2025-01-XX 10:20 - Deployed /utils/api.ts
✅ 2025-01-XX 10:25 - Deployed /components/Emails.tsx
✅ 2025-01-XX 10:30 - Deployed /components/CalendarAccountSetup.tsx
✅ 2025-01-XX 10:40 - Updated /App.tsx
✅ 2025-01-XX 10:50 - Updated /components/Appointments.tsx
✅ 2025-01-XX 11:00 - Testing complete - ALL SYSTEMS GO! 🚀
```

---

## 🎉 SUCCESS CRITERIA

You'll know deployment succeeded when:

✅ **Email Module:**
- "Emails" appears in navigation
- Can connect Gmail/Outlook (demo mode)
- Accounts appear in list
- Can manage connected accounts

✅ **Calendar Sync:**
- "Connect Calendar" / "Manage Calendars" buttons visible
- Can connect Google/Outlook (demo mode)
- "Sync" button imports mock events
- Manage calendars dialog works

✅ **Existing Features:**
- All previous modules work
- CSS unchanged
- No console errors
- Users don't notice anything broke

✅ **Data Isolation:**
- Users only see their own email accounts
- Users only see their own calendar accounts
- Organization boundaries respected

---

## 📚 REFERENCE DOCUMENTS

- `EMAIL_MODULE_COMPLETE.md` - Email feature documentation
- `CALENDAR_SYNC_COMPLETE.md` - Calendar feature documentation
- `CALENDAR_OAUTH_PRODUCTION_SETUP.md` - OAuth setup for calendar
- `EMAIL_OAUTH_PRODUCTION_SETUP.md` - OAuth setup for email
- `CALENDAR_ERROR_FIXED.md` - Demo mode fallback explanation

---

## 🆘 TROUBLESHOOTING

### **"Emails route not showing"**
- Check App.tsx has Emails import
- Check navigation items includes emails
- Check route rendering includes emails case

### **"Calendar sync button missing"**
- Verify Appointments.tsx deployed correctly
- Check CalendarAccountSetup.tsx exists
- Refresh browser cache

### **"Table doesn't exist"**
- Run database migrations again
- Check table names are exact
- Verify in Supabase Table Editor

### **"CSS looks broken"**
- Revert globals.css to backup
- Clear browser cache
- Check for console errors

### **"RLS policy error"**
- Verify policies created
- Check user is authenticated
- Ensure organization_id populated

---

## ✅ FINAL PRE-DEPLOYMENT CHECKLIST

Before you start:
- [ ] Have backup of production /App.tsx
- [ ] Have backup of production /Appointments.tsx
- [ ] Have backup of production /styles/globals.css (if modified)
- [ ] Know how to revert in GitHub (previous commits)
- [ ] Tested email module in Figma Make
- [ ] Tested calendar sync in Figma Make
- [ ] Read this guide fully
- [ ] Have 90 minutes available
- [ ] Deploying during low-traffic time
- [ ] Team knows deployment is happening

**Ready to deploy?** Start with Phase 1: Database! 🚀

---

**Status:** Production-Ready
**Risk Level:** Low (with proper CSS protection)
**Estimated Time:** 90 minutes (frontend only) or 3 hours (with OAuth)
**Recommended:** Deploy frontend first, add OAuth later
