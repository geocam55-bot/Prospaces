# Calendar Sync Implementation Guide

## ✅ What's Been Implemented

### 1. **Database Schema** (`/supabase/migrations/20231113000000_calendar_sync.sql`)
- `calendar_accounts` - Stores connected Google/Outlook calendar accounts
- `calendar_event_mappings` - Maps CRM appointments to external calendar events
- `calendar_sync_log` - Audit log for sync operations
- Row Level Security (RLS) policies matching email permissions
- Indexes for optimal query performance

### 2. **UI Components**
- **CalendarAccountSetup** (`/components/CalendarAccountSetup.tsx`) - OAuth connection dialog
- **Appointments Module** (`/components/Appointments.tsx`) - Enhanced with sync buttons
- "Connect Calendar" button
- "Sync" button (appears when calendars are connected)
- "Manage Calendars" option

### 3. **Mock Sync Functions** (`/utils/calendarSyncMock.ts`)
- Two-way sync simulation (import & export)
- Mock Google Calendar API calls
- Mock Microsoft Graph API calls
- Conflict detection with etags
- Comprehensive error handling
- Sync logging

### 4. **Documentation**
- OAuth setup guide (`/docs/CALENDAR_OAUTH_SETUP.md`)
- Google Calendar API setup
- Microsoft Graph API setup
- Security best practices

---

## 🚀 Getting Started

### Step 1: Run Database Migration

In your Supabase SQL Editor, run:

```bash
# Navigate to your Supabase dashboard
# Go to SQL Editor
# Paste the contents of /supabase/migrations/20231113000000_calendar_sync.sql
# Run the migration
```

Or use the Supabase CLI:

```bash
supabase db push
```

### Step 2: Test the UI (Mock Mode)

The calendar sync is currently running in **mock mode** with simulated API calls.

**To test:**

1. Go to the **Appointments** module
2. Click **"Connect Calendar"**
3. Select Google Calendar or Outlook Calendar
4. Enter your email address
5. Click **"Connect Calendar"** (simulated OAuth)
6. Once connected, click **"Sync"** to test two-way sync

**What happens in mock mode:**
- Mock calendar events are imported (e.g., "Team Standup", "Client Call")
- Existing CRM appointments are "exported" (logged in console)
- Sync results are displayed with toast notifications
- All operations are logged in `calendar_sync_log` table

### Step 3: Monitor Sync Operations

Check the sync logs in Supabase:

```sql
SELECT * FROM calendar_sync_log
ORDER BY created_at DESC
LIMIT 10;
```

View calendar account mappings:

```sql
SELECT 
  ca.email,
  ca.provider,
  ca.connected,
  ca.last_sync,
  COUNT(cem.id) as mapped_events
FROM calendar_accounts ca
LEFT JOIN calendar_event_mappings cem ON ca.id = cem.calendar_account_id
GROUP BY ca.id, ca.email, ca.provider, ca.connected, ca.last_sync;
```

---

## 🔧 Implementing Real OAuth (Production)

### Option 1: Supabase Edge Functions

1. **Create Edge Function for OAuth:**
   ```bash
   supabase functions new calendar-oauth
   ```

2. **Implement OAuth flow:**
   - See `/docs/CALENDAR_OAUTH_SETUP.md` for detailed code examples
   - Handle authorization code exchange
   - Store tokens securely
   - Implement token refresh logic

3. **Update CalendarAccountSetup.tsx:**
   ```typescript
   // Replace mock OAuth with real OAuth redirect
   const handleOAuthConnect = async () => {
     const authUrl = selectedProvider === 'google'
       ? `https://accounts.google.com/o/oauth2/v2/auth?...`
       : `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...`;
     
     window.location.href = authUrl;
   };
   ```

### Option 2: Direct API Integration

Replace mock functions in `/utils/calendarSyncMock.ts` with real API calls:

**For Google Calendar:**
```typescript
import { google } from 'googleapis';

export async function importGoogleCalendarEvents(
  accountId: string,
  accessToken: string
): Promise<CalendarEvent[]> {
  const calendar = google.calendar({ version: 'v3', auth: accessToken });
  
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 100,
    singleEvents: true,
    orderBy: 'startTime',
  });
  
  return response.data.items || [];
}
```

**For Microsoft Graph (Outlook):**
```typescript
import { Client } from '@microsoft/microsoft-graph-client';

export async function importOutlookCalendarEvents(
  accountId: string,
  accessToken: string
): Promise<CalendarEvent[]> {
  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
  
  const response = await client
    .api('/me/calendar/events')
    .top(100)
    .orderby('start/dateTime')
    .get();
  
  return response.value;
}
```

---

## 🔐 Security Considerations

### Current Setup (Matches Email Permissions)
The calendar sync uses the **same RLS policies** as the email system:

```sql
-- Users can only access their own calendar accounts
CREATE POLICY "Users can view their own calendar accounts"
  ON calendar_accounts FOR SELECT
  USING (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );
```

**This means:**
- ✅ Users can only see/sync their own calendars
- ✅ Calendars are scoped to the user's organization
- ✅ No cross-organization data leakage
- ✅ SUPER_ADMIN can access all calendar accounts (if needed)

### Token Security

**⚠️ IMPORTANT:** The current implementation stores tokens as **plain text** (PLACEHOLDER values).

**For production, you MUST:**

1. **Encrypt tokens before storage:**
   ```sql
   -- Use pgcrypto extension
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   
   -- Encrypt before insert
   INSERT INTO calendar_accounts (access_token, ...)
   VALUES (
     pgp_sym_encrypt('actual_token', 'encryption_key'),
     ...
   );
   ```

2. **Use Supabase Vault (recommended):**
   ```typescript
   // Store sensitive data in Vault
   await supabase.rpc('vault.create_secret', {
     secret: accessToken,
     name: `calendar_token_${accountId}`
   });
   ```

3. **Implement token rotation:**
   - Refresh tokens before expiry
   - Handle refresh token failures gracefully
   - Re-authenticate users when needed

---

## 📊 Two-Way Sync Logic

The mock sync demonstrates the full two-way sync flow:

### Import (Calendar → CRM)
1. Fetch events from Google/Outlook Calendar
2. For each event:
   - Check if mapping exists in `calendar_event_mappings`
   - If exists: **Update** existing CRM appointment
   - If not: **Create** new CRM appointment + mapping
3. Use `external_event_etag` for conflict detection

### Export (CRM → Calendar)
1. Find CRM appointments without calendar mappings
2. For each unmapped appointment:
   - Create event in Google/Outlook Calendar
   - Store mapping in `calendar_event_mappings`
   - Track sync direction

### Conflict Resolution
- Use `external_event_etag` (Google) or `@odata.etag` (Outlook)
- When conflict detected:
  - Option 1: CRM wins (overwrite calendar)
  - Option 2: Calendar wins (overwrite CRM)
  - Option 3: Show user conflict resolution dialog

---

## 🧪 Testing Checklist

### Mock Mode Testing
- [ ] Connect Google Calendar account
- [ ] Connect Outlook Calendar account
- [ ] Click "Sync" button
- [ ] Verify mock events are imported
- [ ] Check `calendar_sync_log` table
- [ ] Verify sync statistics in toast notifications
- [ ] Test with multiple calendar accounts
- [ ] Test sync error handling

### Production Testing
- [ ] OAuth flow completes successfully
- [ ] Real calendar events are imported
- [ ] CRM appointments export to calendar
- [ ] Updates sync bidirectionally
- [ ] Deletions are handled correctly
- [ ] Token refresh works
- [ ] RLS policies prevent unauthorized access
- [ ] Sync logs are accurate

---

## 🐛 Troubleshooting

### Issue: "Calendar accounts table not set up"
**Solution:** Run the migration: `/supabase/migrations/20231113000000_calendar_sync.sql`

### Issue: "Organization not found"
**Solution:** Ensure the user is part of an organization in the `user_organizations` table

### Issue: Sync button doesn't appear
**Solution:** Connect at least one calendar account first

### Issue: Mock sync doesn't import events
**Solution:** Check browser console for errors. Ensure appointments table exists and RLS policies allow inserts.

### Issue: Real OAuth not working
**Solution:** 
1. Verify OAuth credentials in `oauth_secrets` table
2. Check redirect URIs match in Google/Microsoft console
3. Ensure scopes include calendar permissions

---

## 📈 Performance Optimization

### Current Implementation
- Indexes on foreign keys
- RLS policies optimized with joins
- Batch operations for multiple events

### Future Enhancements
1. **Incremental Sync:**
   - Use `last_sync` timestamp
   - Only fetch changed events (delta queries)

2. **Webhooks:**
   - Google Calendar push notifications
   - Microsoft Graph change notifications
   - Real-time sync instead of polling

3. **Background Jobs:**
   - Auto-sync every 15-30 minutes
   - Use Supabase Edge Functions with cron

4. **Caching:**
   - Cache frequently accessed calendar data
   - Use React Query for client-side caching

---

## 🎯 Next Steps

1. **Run database migration**
2. **Test mock sync in UI**
3. **Set up OAuth credentials** (follow `/docs/CALENDAR_OAUTH_SETUP.md`)
4. **Replace mock functions with real API calls**
5. **Implement token encryption**
6. **Set up background sync jobs**
7. **Add webhook support for real-time updates**

---

## 📚 Resources

- [Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [Microsoft Graph Calendar API](https://learn.microsoft.com/en-us/graph/api/resources/calendar)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)

---

**Questions or Issues?**
Check the sync logs in `calendar_sync_log` table for detailed error messages and sync statistics.
