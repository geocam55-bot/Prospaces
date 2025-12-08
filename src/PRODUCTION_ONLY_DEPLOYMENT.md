log (
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

CREATE INDEX idx_email_sync_log_account ON email_sync_log(account_id);

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

CREATE INDEX idx_calendar_sync_log_account ON calendar_sync_log(account_id);

-- Add columns to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS calendar_account_id UUID 
  REFERENCES calendar_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_external_id ON appointments(external_id);
CREATE INDEX IF NOT EXISTS idx_appointments_calendar_account ON appointments(calendar_account_id);

-- Add column to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE INDEX IF NOT EXISTS idx_contacts_external_id ON contacts(external_id);
```

---

### **PHASE 3: Deploy Edge Functions (20 min)**

**Prerequisites:**
- Supabase CLI installed: `npm install -g supabase`
- Logged in: `supabase login`
- Linked to project: `supabase link --project-ref YOUR_PROJECT_REF`

#### **Deploy Functions:**

```bash
# Navigate to project directory
cd your-project

# Deploy email functions
supabase functions deploy gmail-oauth-init
supabase functions deploy gmail-oauth-callback
supabase functions deploy gmail-sync

# Deploy calendar functions
supabase functions deploy calendar-oauth-init
supabase functions deploy calendar-oauth-callback
supabase functions deploy calendar-sync
```

#### **Set Secrets:**

```bash
# Google credentials
supabase secrets set GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
supabase secrets set GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

# Microsoft credentials
supabase secrets set MICROSOFT_CLIENT_ID="YOUR_MICROSOFT_CLIENT_ID"
supabase secrets set MICROSOFT_CLIENT_SECRET="YOUR_MICROSOFT_CLIENT_SECRET"

# Redirect URIs
supabase secrets set EMAIL_REDIRECT_URI="https://YOUR_PROJECT_REF.supabase.co/functions/v1/gmail-oauth-callback"
supabase secrets set CALENDAR_REDIRECT_URI="https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar-oauth-callback"
```

#### **Verify Deployment:**

```bash
supabase functions list

# Should show:
# - gmail-oauth-init
# - gmail-oauth-callback
# - gmail-sync
# - calendar-oauth-init
# - calendar-oauth-callback
# - calendar-sync
```

---

### **PHASE 4: Deploy Frontend (15 min)**

**Now deploy to GitHub:**

#### **1. Update /utils/api.ts**

Add to end of file:

```typescript
// Email API
export const emailsAPI = {
  getAccounts: async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    return { accounts: data || [] };
  },

  deleteAccount: async (accountId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', accountId);

    if (error) throw error;
    return { success: true };
  },
};
```

#### **2. Create /components/Emails.tsx**

Copy entire file from Figma Make.

#### **3. Create /components/CalendarAccountSetup.tsx**

Copy entire file from Figma Make.

#### **4. Update /App.tsx**

Add import:
```typescript
import { Emails } from './components/Emails';
import { Mail } from 'lucide-react';
```

Add to navigationItems:
```typescript
{ name: 'Emails', icon: Mail, path: 'emails' },
```

Add route:
```typescript
{activeTab === 'emails' && <Emails user={user} />}
```

#### **5. Update /components/Appointments.tsx**

Replace entire file with version from Figma Make.

---

### **PHASE 5: Testing (10 min)**

#### **Test Email OAuth:**

1. Navigate to Emails
2. Click "Connect Email"
3. Choose Gmail
4. Enter your email
5. Click "Connect Email"
6. **Should redirect to Google login**
7. Grant permissions
8. **Should redirect back to app**
9. Email account appears in list ✅

#### **Test Calendar OAuth:**

1. Navigate to Appointments
2. Click "Connect Calendar"
3. Choose Google Calendar
4. Enter your email
5. Click "Connect Calendar"
6. **Should redirect to Google login**
7. Grant permissions
8. **Should redirect back to app**
9. Calendar appears in "Manage Calendars" ✅

#### **Test Calendar Sync:**

1. Click "Sync" button
2. Should call Edge Function
3. Imports real events from Google Calendar
4. Events appear in Appointments list ✅

---

## ✅ SUCCESS CRITERIA

**Edge Functions Working:**
- [ ] OAuth redirect happens (Google/Microsoft login)
- [ ] Redirects back to app after auth
- [ ] Access tokens saved to database
- [ ] Sync button works
- [ ] Real calendar events imported

**No Mock Fallback:**
- [ ] No "demo mode" messages
- [ ] Real OAuth flows only
- [ ] Actual API calls to Gmail/Outlook
- [ ] No mock data

**Production Ready:**
- [ ] All existing features work
- [ ] CSS unchanged
- [ ] No console errors
- [ ] Real integrations working

---

## 🚨 TROUBLESHOOTING

### **"Redirect URI mismatch"**
- Check Google/Microsoft OAuth settings
- Ensure redirect URIs exactly match Edge Function URLs
- Format: `https://PROJECT_REF.supabase.co/functions/v1/gmail-oauth-callback`

### **"Edge Function error"**
- Check function deployed: `supabase functions list`
- Check secrets set: `supabase secrets list`
- Check function logs: `supabase functions logs gmail-oauth-init`

### **"Invalid credentials"**
- Verify OAuth credentials copied correctly
- Check client ID and secret in Supabase secrets
- Regenerate credentials if needed

### **"Sync not working"**
- Check calendar-sync function deployed
- Verify access token saved in database
- Check Edge Function logs for errors

---

## 📊 DEPLOYMENT TIME BREAKDOWN

- OAuth setup: 60 min
- Database: 10 min
- Edge Functions: 20 min
- Frontend: 15 min
- Testing: 10 min

**Total: 115 minutes** (~2 hours)

---

## 🎯 POST-DEPLOYMENT

**Monitor Edge Functions:**
```bash
# Watch real-time logs
supabase functions logs gmail-oauth-init --tail
supabase functions logs calendar-sync --tail
```

**Check Database:**
```sql
-- See connected accounts
SELECT * FROM email_accounts;
SELECT * FROM calendar_accounts;

-- See sync activity
SELECT * FROM email_sync_log ORDER BY created_at DESC LIMIT 10;
SELECT * FROM calendar_sync_log ORDER BY created_at DESC LIMIT 10;
```

---

## ✅ FINAL CHECKLIST

**Before Going Live:**
- [ ] OAuth credentials set up (Google + Microsoft)
- [ ] Edge Functions deployed (6 functions)
- [ ] Supabase secrets configured (6 secrets)
- [ ] Database migrations run
- [ ] Frontend deployed to GitHub
- [ ] Tested email OAuth flow
- [ ] Tested calendar OAuth flow
- [ ] Tested sync functionality
- [ ] No mock files deployed
- [ ] Production mode confirmed

**Everything checked?** ✅ **PRODUCTION READY!** 🚀

---

## 📝 PRODUCTION CONFIGURATION

**Your Edge Function URLs:**
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/gmail-oauth-init
https://YOUR_PROJECT_REF.supabase.co/functions/v1/gmail-oauth-callback
https://YOUR_PROJECT_REF.supabase.co/functions/v1/gmail-sync
https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar-oauth-init
https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar-oauth-callback
https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar-sync
```

**OAuth Redirect URIs (add to Google/Microsoft):**
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/gmail-oauth-callback
https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar-oauth-callback
```

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference.

---

**Status:** Production-Ready
**Mode:** Real OAuth Only
**Mock Files:** None Deployed
**Estimated Time:** 2 hours