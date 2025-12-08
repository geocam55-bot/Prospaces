# Calendar & Email Sync - Complete Documentation

## 📋 Overview

ProSpaces CRM now supports **two-way calendar sync** with Google Calendar and Outlook Calendar, complementing the existing email integration. Both systems share the same security model and RLS policies.

---

## 🎯 Features

### ✅ Email Integration (Existing)
- Gmail, Outlook, Apple Mail, and IMAP support
- OAuth authentication
- Send/receive emails within CRM
- Email storage in Supabase
- Manual sync with Nylas Edge Functions (optional)

### 🆕 Calendar Integration (New)
- **Google Calendar** sync
- **Outlook Calendar** sync  
- **Two-way sync**: Import events from calendar → CRM, Export appointments from CRM → calendar
- Conflict detection with ETags
- Sync logging and audit trail
- Manual sync with visual feedback
- Mock mode for UI testing (production-ready structure)

---

## 🔐 Security Model

Both email and calendar use **identical RLS policies**:

```sql
-- Same permissions for both systems
CREATE POLICY "Users can view their own [email/calendar] accounts"
  ON [email/calendar]_accounts FOR SELECT
  USING (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );
```

**This ensures:**
- Users only access their own accounts
- Organization-level data isolation
- SUPER_ADMIN access (if configured)
- No cross-tenant data leakage

---

## 📁 File Structure

### Database Migrations
```
/supabase/migrations/
├── 20231112000000_email_oauth.sql       # Email accounts & messages
└── 20231113000000_calendar_sync.sql     # Calendar accounts & mappings (NEW)
```

### Components
```
/components/
├── Email.tsx                            # Email module (existing)
├── EmailAccountSetup.tsx               # Email OAuth dialog (existing)
├── Appointments.tsx                    # Enhanced with calendar sync (UPDATED)
└── CalendarAccountSetup.tsx            # Calendar OAuth dialog (NEW)
```

### Utilities
```
/utils/
└── calendarSyncMock.ts                 # Mock sync functions (NEW)
```

### Documentation
```
/docs/
├── CALENDAR_OAUTH_SETUP.md                      # OAuth setup guide (NEW)
├── CALENDAR_SYNC_IMPLEMENTATION_GUIDE.md        # Implementation guide (NEW)
└── CALENDAR_AND_EMAIL_SYNC_README.md            # This file (NEW)
```

---

## 🚀 Quick Start

### 1. Run Database Migration

**In Supabase SQL Editor:**
```sql
-- Run the contents of:
-- /supabase/migrations/20231113000000_calendar_sync.sql
```

**Or via Supabase CLI:**
```bash
supabase db push
```

### 2. Test Calendar Sync (Mock Mode)

1. Navigate to **Appointments** module
2. Click **"Connect Calendar"**
3. Select **Google Calendar** or **Outlook Calendar**
4. Enter your email address
5. Click **"Connect Calendar"** (simulated OAuth)
6. Click **"Sync"** to test two-way sync

**Expected Result:**
- Mock events imported (e.g., "Team Standup", "Client Call")
- Toast notification: "Synced 1 calendar account!"
- New appointments appear in the list
- Sync logged in `calendar_sync_log` table

### 3. Verify in Database

```sql
-- Check calendar accounts
SELECT * FROM calendar_accounts;

-- Check event mappings
SELECT * FROM calendar_event_mappings;

-- Check sync logs
SELECT * FROM calendar_sync_log
ORDER BY created_at DESC;
```

---

## 📊 Database Tables

### Email System (Existing)
| Table | Purpose |
|-------|---------|
| `email_accounts` | Connected email accounts (Gmail, Outlook, etc.) |
| `email_messages` | Stored email messages |
| `email_attachments` | Email attachment metadata |
| `oauth_secrets` | OAuth client credentials (service role only) |

### Calendar System (New)
| Table | Purpose |
|-------|---------|
| `calendar_accounts` | Connected calendar accounts (Google, Outlook) |
| `calendar_event_mappings` | Maps CRM appointments ↔ Calendar events |
| `calendar_sync_log` | Audit log for sync operations |

---

## 🔄 Two-Way Sync Flow

### Import (Calendar → CRM)
```
1. Fetch events from Google/Outlook Calendar API
2. For each event:
   ├─ Check if calendar_event_mapping exists
   ├─ If YES → Update existing CRM appointment
   └─ If NO  → Create new CRM appointment + mapping
3. Log sync operation
```

### Export (CRM → Calendar)
```
1. Find CRM appointments without calendar mappings
2. For each unmapped appointment:
   ├─ Create event in Google/Outlook Calendar API
   ├─ Store external_event_id in mapping
   └─ Track sync_direction = 'crm_to_calendar'
3. Log sync operation
```

### Conflict Detection
- Uses `external_event_etag` (Google) or `@odata.etag` (Outlook)
- Compares last modified timestamps
- Configurable conflict resolution strategy

---

## 🧩 UI Components

### Appointments Module
**New Buttons:**
- **"Connect Calendar"** - Opens CalendarAccountSetup dialog
- **"Sync"** - Triggers two-way sync (appears after connecting)
- **"Manage Calendars"** - View/edit connected accounts

**Visual Feedback:**
- Loading spinner during sync
- Toast notifications with sync results
- Error messages if sync fails
- Connected account badges

### CalendarAccountSetup Dialog
**Screens:**
1. **Select Provider** - Choose Google or Outlook
2. **OAuth Authorization** - Enter email, initiate OAuth (simulated)
3. **Success** - Confirmation screen

**Features:**
- Provider-specific branding (colors, icons)
- Email validation
- Error handling with user-friendly messages
- Two-way sync explanation

---

## 🛠 Implementation Status

### ✅ Complete (Mock Mode)
- Database schema with RLS policies
- UI components for calendar connection
- Two-way sync logic (mock)
- Sync logging and audit trail
- Error handling and user feedback
- Security model (RLS policies)
- Mock API functions for testing

### ⏳ To Do (Production)
- [ ] Set up Google Calendar OAuth credentials
- [ ] Set up Microsoft Graph OAuth credentials
- [ ] Implement real OAuth redirect flow
- [ ] Replace mock functions with real API calls
- [ ] Implement token encryption (pgcrypto or Vault)
- [ ] Add token refresh logic
- [ ] Set up background sync jobs (cron)
- [ ] Implement webhook listeners (real-time sync)
- [ ] Add conflict resolution UI

---

## 📖 Documentation

### For Setup & Configuration:
- **`/docs/CALENDAR_OAUTH_SETUP.md`**
  - Google Calendar API setup
  - Microsoft Graph API setup
  - OAuth credentials configuration
  - Edge Function examples
  - Security best practices

### For Implementation:
- **`/docs/CALENDAR_SYNC_IMPLEMENTATION_GUIDE.md`**
  - Step-by-step implementation
  - Mock vs. production mode
  - Testing checklist
  - Troubleshooting guide
  - Performance optimization tips

---

## 🔍 Monitoring & Debugging

### Check Sync Logs
```sql
SELECT 
  csl.created_at,
  ca.email,
  ca.provider,
  csl.sync_type,
  csl.sync_direction,
  csl.events_imported,
  csl.events_exported,
  csl.events_updated,
  csl.errors,
  csl.status
FROM calendar_sync_log csl
JOIN calendar_accounts ca ON csl.calendar_account_id = ca.id
ORDER BY csl.created_at DESC
LIMIT 20;
```

### Check Mapped Events
```sql
SELECT 
  a.title,
  a.start_time,
  ca.email,
  ca.provider,
  cem.external_event_id,
  cem.sync_status,
  cem.last_synced
FROM appointments a
JOIN calendar_event_mappings cem ON a.id = cem.appointment_id
JOIN calendar_accounts ca ON cem.calendar_account_id = ca.id
ORDER BY a.start_time DESC;
```

### Browser Console Logs
```javascript
// Look for these log prefixes:
[Calendar] Account connected: {...}
[Mock Sync] Starting calendar sync...
[Mock] Importing from Google Calendar...
[Mock Sync] Sync completed: { imported: 2, exported: 0, ... }
```

---

## ⚠️ Important Notes

### Email vs. Calendar
| Feature | Email | Calendar |
|---------|-------|----------|
| Providers | Gmail, Outlook, Apple, IMAP | Google, Outlook |
| Auth | OAuth + IMAP | OAuth only |
| Sync | Nylas Edge Functions (optional) | Mock → Real API |
| Storage | `email_messages` table | Maps to `appointments` |
| Direction | Import only (receive) | Two-way (import & export) |

### Current Limitations (Mock Mode)
- OAuth flow is simulated (no real Google/Microsoft auth)
- Calendar events are mock data
- Tokens are placeholders
- Sync is manual (no auto-sync)
- No webhook support

### Production Requirements
1. **OAuth Setup**: Google & Microsoft developer accounts
2. **API Keys**: Store in `oauth_secrets` table or Supabase Vault
3. **Token Encryption**: Use pgcrypto or Vault
4. **Error Handling**: Handle API rate limits, network errors
5. **Monitoring**: Set up logging and alerts

---

## 🎓 Next Steps

### For Testing (Now)
1. Run database migration
2. Test UI in mock mode
3. Verify sync logs in Supabase
4. Review generated appointments

### For Production (Later)
1. Follow `/docs/CALENDAR_OAUTH_SETUP.md`
2. Set up OAuth credentials
3. Replace mock functions in `/utils/calendarSyncMock.ts`
4. Implement token encryption
5. Set up background sync
6. Add webhook support

---

## 🆘 Support

### Troubleshooting
See `/docs/CALENDAR_SYNC_IMPLEMENTATION_GUIDE.md` for common issues and solutions.

### Database Issues
```sql
-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'calendar%';

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE 'calendar%';
```

### UI Issues
- Check browser console for errors
- Verify user is authenticated
- Ensure user belongs to an organization
- Check that calendar accounts exist

---

## ✨ Summary

You now have a **complete calendar sync system** that:
- ✅ Works in mock mode for immediate testing
- ✅ Has production-ready database structure
- ✅ Shares security model with email system
- ✅ Includes comprehensive documentation
- ✅ Supports two-way sync (import & export)
- ✅ Logs all sync operations
- ✅ Handles errors gracefully

**No existing functionality has been broken** - the Appointments module works exactly as before, with calendar sync as an optional enhancement!

---

**Ready to test?** Go to Appointments → Connect Calendar → Sync! 🎉
