# 🚀 Nylas Quick Reference Guide

## 📋 Quick Deploy Checklist

```bash
# 1. Deploy Edge Functions (copy/paste this)
supabase functions deploy nylas-connect && \
supabase functions deploy nylas-callback && \
supabase functions deploy nylas-webhook && \
supabase functions deploy nylas-sync-emails && \
supabase functions deploy nylas-sync-calendar && \
supabase functions deploy nylas-create-event && \
supabase functions deploy nylas-send-email

# 2. Set Secrets
supabase secrets set NYLAS_API_KEY="nyk_xxx_your_api_key"
supabase secrets set NYLAS_WEBHOOK_SECRET="your_webhook_secret"
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"

# 3. Apply Migrations
supabase db push

# 4. Verify
supabase functions list
supabase secrets list
```

---

## 🔗 Important URLs

### **Nylas Dashboard:**
```
https://dashboard.nylas.com/
```

### **Your Edge Function URLs:**
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-connect
https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-callback
https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-webhook
https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-sync-emails
https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-sync-calendar
https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-create-event
https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-send-email
```

### **Redirect URIs (add to Nylas):**
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-callback
```

### **Webhook URL (add to Nylas):**
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-webhook
```

---

## 🔑 Required Credentials

### **Nylas:**
- ✅ NYLAS_API_KEY (from Nylas Dashboard)
- ✅ NYLAS_WEBHOOK_SECRET (from Nylas Webhook settings)

### **Google Cloud (for Gmail/Calendar):**
- ✅ OAuth Client ID
- ✅ OAuth Client Secret
- ✅ Configure in Nylas Dashboard → Connectors → Google

### **Microsoft Azure (for Outlook):**
- ✅ Application ID
- ✅ Client Secret
- ✅ Configure in Nylas Dashboard → Connectors → Microsoft

---

## 📊 Database Tables

### **email_accounts:**
```sql
id                  UUID PRIMARY KEY
user_id             UUID (references auth.users)
organization_id     TEXT
provider            TEXT (gmail, outlook, apple, imap)
email               TEXT
connected           BOOLEAN
last_sync           TIMESTAMPTZ
nylas_grant_id      TEXT (Nylas grant identifier)
nylas_access_token  TEXT (Nylas access token)
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### **emails:**
```sql
id              UUID PRIMARY KEY
user_id         UUID
organization_id TEXT
account_id      UUID (references email_accounts)
message_id      TEXT (Nylas message ID)
from_email      TEXT
to_email        TEXT
cc_email        TEXT
bcc_email       TEXT
subject         TEXT
body            TEXT
folder          TEXT (inbox, sent, drafts, trash, archive)
is_read         BOOLEAN
is_starred      BOOLEAN
contact_id      UUID (optional link to CRM contact)
bid_id          UUID (optional link to CRM bid)
task_id         UUID (optional link to CRM task)
received_at     TIMESTAMPTZ
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### **appointments (updated):**
```sql
-- Existing columns...
calendar_event_id   TEXT (Nylas event ID)
calendar_provider   TEXT (gmail, outlook, apple)
attendees           TEXT (comma-separated emails)
```

---

## 🔄 Edge Function Reference

### **1. nylas-connect**
**Purpose:** Initiate OAuth connection
**Method:** POST
**Auth:** Required
**Body:**
```json
{
  "provider": "gmail" | "outlook" | "apple" | "imap"
}
```
**Returns:**
```json
{
  "success": true,
  "authUrl": "https://nylas-oauth-url..."
}
```

---

### **2. nylas-callback**
**Purpose:** OAuth callback handler
**Method:** GET
**Auth:** Not required (OAuth callback)
**Query Params:** `code`, `state`
**Returns:** HTML (closes popup, sends message to parent)

---

### **3. nylas-webhook**
**Purpose:** Receive webhooks from Nylas (auto-sync)
**Method:** POST
**Auth:** Not required (webhook)
**Body:** Nylas webhook payload
**Returns:**
```json
{
  "success": true,
  "processed": 5
}
```

---

### **4. nylas-sync-emails**
**Purpose:** Manual email sync (initial sync)
**Method:** POST
**Auth:** Required
**Body:**
```json
{
  "accountId": "uuid"
}
```
**Returns:**
```json
{
  "success": true,
  "syncedCount": 42,
  "lastSync": "2024-12-10T12:00:00Z"
}
```

---

### **5. nylas-sync-calendar**
**Purpose:** Manual calendar sync (initial sync)
**Method:** POST
**Auth:** Required
**Body:**
```json
{
  "accountId": "uuid"
}
```
**Returns:**
```json
{
  "success": true,
  "syncedCount": 15,
  "calendarsCount": 3,
  "lastSync": "2024-12-10T12:00:00Z"
}
```

---

### **6. nylas-create-event**
**Purpose:** Create calendar event
**Method:** POST
**Auth:** Required
**Body:**
```json
{
  "accountId": "uuid",
  "title": "Meeting with John",
  "description": "Discuss Q4 goals",
  "location": "Conference Room A",
  "startTime": "2024-12-15T14:00:00Z",
  "endTime": "2024-12-15T15:00:00Z",
  "attendees": ["john@example.com", "jane@example.com"]
}
```
**Returns:**
```json
{
  "success": true,
  "appointment": { ... },
  "eventId": "nylas-event-id"
}
```

---

### **7. nylas-send-email**
**Purpose:** Send email
**Method:** POST
**Auth:** Required
**Body:**
```json
{
  "accountId": "uuid",
  "to": "recipient@example.com",
  "subject": "Hello",
  "body": "Email body content",
  "cc": "cc@example.com" (optional),
  "bcc": "bcc@example.com" (optional)
}
```
**Returns:**
```json
{
  "success": true,
  "messageId": "nylas-message-id"
}
```

---

## 🎯 Common Tasks

### **Connect an Account:**
```typescript
const response = await supabase.functions.invoke('nylas-connect', {
  body: { provider: 'gmail' }
});

const { authUrl } = response.data;
window.open(authUrl, '_blank', 'width=600,height=700');
```

### **Send an Email:**
```typescript
await supabase.functions.invoke('nylas-send-email', {
  body: {
    accountId: 'account-uuid',
    to: 'recipient@example.com',
    subject: 'Hello',
    body: 'Email content here'
  }
});
```

### **Create Calendar Event:**
```typescript
await supabase.functions.invoke('nylas-create-event', {
  body: {
    accountId: 'account-uuid',
    title: 'Meeting',
    startTime: '2024-12-15T14:00:00Z',
    endTime: '2024-12-15T15:00:00Z',
    attendees: ['john@example.com']
  }
});
```

### **Subscribe to Real-Time Updates:**
```typescript
// Email updates
const emailSub = supabase
  .channel('emails')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'emails' },
    (payload) => {
      console.log('New email:', payload.new);
      // Update UI automatically
    }
  )
  .subscribe();

// Calendar updates
const calendarSub = supabase
  .channel('appointments')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'appointments', filter: `calendar_event_id=neq.null` },
    (payload) => {
      console.log('Calendar updated:', payload.new);
      // Update UI automatically
    }
  )
  .subscribe();
```

---

## 🐛 Debugging

### **View Edge Function Logs:**
```bash
# Real-time logs
supabase functions logs nylas-webhook --tail

# Recent logs
supabase functions logs nylas-webhook --limit 50
```

### **Check Webhook Deliveries:**
1. Go to Nylas Dashboard
2. Navigate to "Webhooks"
3. Click on your webhook
4. View "Recent Deliveries"

### **Common Issues:**

**"Invalid grant_id"**
- Check email_accounts table has nylas_grant_id
- Verify account is properly connected

**"Webhook not firing"**
- Check webhook URL is correct in Nylas Dashboard
- Verify webhook events are enabled
- Check Edge Function logs

**"OAuth fails"**
- Verify redirect URI matches exactly
- Check Google/Microsoft credentials in Nylas
- Ensure OAuth consent screen is configured

---

## 📚 Nylas API Reference

### **Base URL:**
```
https://api.us.nylas.com/v3
```

### **Authentication:**
```
Authorization: Bearer YOUR_NYLAS_API_KEY
```

### **Common Endpoints:**

**List Messages:**
```
GET /grants/{grant_id}/messages?limit=50
```

**Get Message:**
```
GET /grants/{grant_id}/messages/{message_id}
```

**Send Message:**
```
POST /grants/{grant_id}/messages/send
```

**List Events:**
```
GET /grants/{grant_id}/events?calendar_id={cal_id}
```

**Create Event:**
```
POST /grants/{grant_id}/events?calendar_id={cal_id}
```

**List Calendars:**
```
GET /grants/{grant_id}/calendars
```

---

## ✅ Testing Checklist

### **Email:**
- [ ] Connect Gmail account
- [ ] Send yourself an email externally
- [ ] Verify it appears in UI within 10 seconds
- [ ] Send email from ProSpaces
- [ ] Verify it appears in Gmail sent folder

### **Calendar:**
- [ ] Connect Google Calendar account
- [ ] Create event in Google Calendar
- [ ] Verify it appears in ProSpaces within 10 seconds
- [ ] Create event in ProSpaces
- [ ] Verify it appears in Google Calendar

### **Webhooks:**
- [ ] Check Nylas Dashboard → Webhooks → Recent Deliveries
- [ ] Verify webhook fires when email arrives
- [ ] Verify webhook fires when event created
- [ ] Check Edge Function logs for webhook processing

---

## 🔐 Security Checklist

- [ ] NYLAS_API_KEY is set as secret (not in code)
- [ ] NYLAS_WEBHOOK_SECRET is set
- [ ] Webhook signature verification enabled (production)
- [ ] Row Level Security enabled on all tables
- [ ] OAuth scopes are minimal (only what's needed)
- [ ] Tokens encrypted at rest (Nylas handles this)

---

## 💰 Cost Calculator

**Free Tier:** 5 accounts
**Paid:** $12/month per account (Starter)

**Example costs:**
- 5 users = **FREE**
- 10 users = **$60/month** (5 free + 5 paid)
- 25 users = **$240/month** (5 free + 20 paid)
- 50 users = **$540/month** (5 free + 45 paid)

**Pass cost to customers:**
- Charge $15/user/month
- Nylas costs $12/user/month
- **Profit:** $3/user/month

---

## 📞 Support

**Nylas Support:**
- Email: support@nylas.com
- Docs: https://developer.nylas.com/docs/

**Supabase Support:**
- Discord: https://discord.supabase.com/
- Docs: https://supabase.com/docs

---

## 🎯 Next Steps After Deployment

1. ✅ Test with your own email account
2. ✅ Test with a colleague's account
3. ✅ Monitor webhook deliveries
4. ✅ Check Edge Function logs for errors
5. ✅ Set up error alerting (optional)
6. ✅ Document for your team
7. ✅ Train customer support on new auto-sync feature

---

**You're all set!** 🚀

Keep this guide handy for quick reference during development and debugging.
