# 🚀 Nylas Full Integration Deployment Guide

## 📋 Overview

This guide covers deploying ProSpaces CRM with **full Nylas integration** for:
- ✅ **Email sync** (Gmail, Outlook, Office 365, iCloud, Yahoo)
- ✅ **Calendar sync** (Google Calendar, Outlook Calendar)
- ✅ **Auto-sync with webhooks** (no manual sync buttons needed)
- ✅ **Two-way sync** (changes sync both ways automatically)
- ✅ **Real-time updates** (new emails/events appear instantly)

---

## 🎯 What You Get

### **Before (Old Approach):**
- ❌ Separate Google OAuth + Microsoft OAuth
- ❌ Manual "Sync" buttons required
- ❌ Complex token management
- ❌ No real-time updates
- ❌ Fragile integration

### **After (Nylas Integration):**
- ✅ **One OAuth flow** for all providers
- ✅ **Auto-sync** - no buttons needed
- ✅ **Real-time** - instant updates
- ✅ **Unified API** - same code for all providers
- ✅ **Production-ready** - battle-tested at scale

---

## 📦 Prerequisites

**You need:**
1. ✅ Supabase project (existing)
2. ✅ Supabase CLI installed
3. ✅ Nylas account (free tier available)
4. ✅ Google Cloud Project (for Gmail/Calendar)
5. ✅ Microsoft Azure App (optional, for Outlook)

---

## 🔧 Step 1: Set Up Nylas Account

### **1.1 Create Nylas Account**

1. Go to: https://www.nylas.com/
2. Click "Start Building for Free"
3. Sign up (free tier: 5 accounts)
4. Verify your email

### **1.2 Create Nylas Application**

1. Log into Nylas Dashboard
2. Click "Applications" → "Create Application"
3. Name: `ProSpaces CRM`
4. Click "Create"

### **1.3 Get API Credentials**

1. In your Nylas application, go to "Settings"
2. Copy these values:
   - **API Key** (starts with `nyk_...`)
   - **API Secret** (keep this secure!)
   - **Client ID**

### **1.4 Configure Redirect URI**

1. In Nylas Dashboard → "Settings" → "Redirect URIs"
2. Add this URL:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-callback
   ```
3. Replace `YOUR_PROJECT_REF` with your actual Supabase project reference

### **1.5 Set Up Webhook**

1. In Nylas Dashboard → "Webhooks"
2. Click "Add Webhook"
3. **Webhook URL:**
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/nylas-webhook
   ```
4. **Events to subscribe to:**
   - ✅ `message.created`
   - ✅ `message.updated`
   - ✅ `message.deleted`
   - ✅ `event.created`
   - ✅ `event.updated`
   - ✅ `event.deleted`
5. Click "Create Webhook"
6. Copy the **Webhook Secret** (for signature verification)

---

## 🔧 Step 2: Configure Google Cloud (for Gmail/Calendar)

### **2.1 Create Google Cloud Project**

1. Go to: https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Name: `ProSpaces CRM`
4. Click "Create"

### **2.2 Enable APIs**

1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search and enable these APIs:
   - ✅ **Gmail API**
   - ✅ **Google Calendar API**
   - ✅ **Google People API** (for contacts)

### **2.3 Configure OAuth Consent Screen**

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (unless you have Google Workspace)
3. Fill out the form:
   - **App name:** ProSpaces CRM
   - **User support email:** your email
   - **Developer contact:** your email
4. Click "Save and Continue"

### **2.4 Add Scopes**

1. Click "Add or Remove Scopes"
2. Add these scopes:
   ```
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/gmail.modify
   https://www.googleapis.com/auth/calendar
   https://www.googleapis.com/auth/calendar.events
   ```
3. Click "Update" → "Save and Continue"

### **2.5 Add Test Users (if not published)**

1. Click "Add Users"
2. Add your email addresses
3. Click "Save and Continue"

### **2.6 Create OAuth Credentials**

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: **Web application**
4. Name: `ProSpaces CRM`
5. **Authorized redirect URIs:**
   ```
   https://api.us.nylas.com/v3/connect/callback
   ```
   (This is Nylas's callback URL - Nylas handles the OAuth flow)
6. Click "Create"
7. Copy **Client ID** and **Client Secret**

### **2.7 Configure in Nylas**

1. Go back to Nylas Dashboard
2. Navigate to "Connectors" → "Google"
3. Click "Edit Configuration"
4. Enter your Google OAuth credentials:
   - **Client ID:** from Google Cloud
   - **Client Secret:** from Google Cloud
5. Click "Save"

---

## 🔧 Step 3: Configure Microsoft Azure (Optional - for Outlook)

### **3.1 Create Azure AD App**

1. Go to: https://portal.azure.com/
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Name: `ProSpaces CRM`
5. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
6. Redirect URI:
   ```
   https://api.us.nylas.com/v3/connect/callback
   ```
7. Click "Register"

### **3.2 Configure API Permissions**

1. In your app, go to "API permissions"
2. Click "Add a permission" → "Microsoft Graph"
3. Select "Delegated permissions"
4. Add these permissions:
   - ✅ `Mail.Read`
   - ✅ `Mail.ReadWrite`
   - ✅ `Mail.Send`
   - ✅ `Calendars.Read`
   - ✅ `Calendars.ReadWrite`
5. Click "Add permissions"
6. Click "Grant admin consent" (if you're admin)

### **3.3 Create Client Secret**

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Description: `ProSpaces CRM`
4. Expires: 24 months (or your preference)
5. Click "Add"
6. **Copy the secret value** (you won't see it again!)

### **3.4 Get Application ID**

1. Go to "Overview"
2. Copy **Application (client) ID**

### **3.5 Configure in Nylas**

1. Go back to Nylas Dashboard
2. Navigate to "Connectors" → "Microsoft"
3. Click "Edit Configuration"
4. Enter your Azure credentials:
   - **Client ID:** from Azure
   - **Client Secret:** from Azure
5. Click "Save"

---

## 🔧 Step 4: Deploy Edge Functions

### **4.1 Deploy Nylas Functions**

```bash
# Navigate to your project directory
cd your-project

# Deploy all Nylas Edge Functions
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-webhook
supabase functions deploy nylas-sync-emails
supabase functions deploy nylas-sync-calendar
supabase functions deploy nylas-create-event
supabase functions deploy nylas-send-email
```

### **4.2 Verify Deployment**

```bash
supabase functions list

# Should show:
# ✅ nylas-connect
# ✅ nylas-callback
# ✅ nylas-webhook
# ✅ nylas-sync-emails
# ✅ nylas-sync-calendar
# ✅ nylas-create-event
# ✅ nylas-send-email
```

---

## 🔧 Step 5: Configure Supabase Secrets

### **5.1 Set Nylas Secrets**

```bash
# Nylas API credentials
supabase secrets set NYLAS_API_KEY="nyk_xxx_your_api_key"
supabase secrets set NYLAS_WEBHOOK_SECRET="your_webhook_secret"

# Your Supabase URL (for redirect URIs)
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
```

### **5.2 Verify Secrets**

```bash
supabase secrets list

# Should show:
# ✅ NYLAS_API_KEY
# ✅ NYLAS_WEBHOOK_SECRET
# ✅ SUPABASE_URL
# ✅ SUPABASE_ANON_KEY (already set)
# ✅ SUPABASE_SERVICE_ROLE_KEY (already set)
```

---

## 🔧 Step 6: Run Database Migrations

### **6.1 Apply Migrations**

```bash
# Push database migrations to Supabase
supabase db push

# Or manually run this SQL in Supabase SQL Editor:
```

```sql
-- Add calendar sync fields to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS calendar_event_id TEXT,
ADD COLUMN IF NOT EXISTS calendar_provider TEXT,
ADD COLUMN IF NOT EXISTS attendees TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_calendar_event_id 
ON appointments(calendar_event_id);
```

### **6.2 Verify Tables**

```sql
-- Check if columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'appointments';

-- Should show: calendar_event_id, calendar_provider, attendees
```

---

## 🔧 Step 7: Update Your Frontend

The Nylas integration is already implemented in your UI components. No changes needed!

### **Email Component** (`/components/Email.tsx`)
- ✅ Auto-syncs emails via webhook
- ✅ Real-time updates via Supabase Realtime
- ✅ No manual "Sync" button needed
- ✅ Sends emails via Nylas

### **Appointments Component** (`/components/Appointments.tsx`)
- ✅ Auto-syncs calendar events via webhook
- ✅ Creates events in external calendar
- ✅ Two-way sync (changes sync both ways)
- ✅ Real-time updates

---

## 🔧 Step 8: Test the Integration

### **8.1 Connect an Account**

1. Log into ProSpaces CRM
2. Go to **Email** module
3. Click "Connect Email Account"
4. Choose "Gmail" or "Outlook"
5. Complete OAuth flow
6. ✅ Account connected!

### **8.2 Test Email Sync**

1. Send yourself an email (external client)
2. Wait 5-10 seconds
3. Check ProSpaces Email module
4. ✅ Email should appear automatically (no sync button!)

### **8.3 Test Calendar Sync**

1. Create event in Google Calendar / Outlook
2. Wait 5-10 seconds
3. Check ProSpaces Appointments module
4. ✅ Event should appear automatically!

### **8.4 Test Two-Way Sync**

1. Create appointment in ProSpaces
2. Check your Google Calendar / Outlook
3. ✅ Event should appear there too!

---

## 🔧 Step 9: Monitor and Debug

### **9.1 View Edge Function Logs**

```bash
# Real-time logs
supabase functions logs nylas-webhook --tail
supabase functions logs nylas-sync-emails --tail

# Recent logs
supabase functions logs nylas-webhook
```

### **9.2 Check Webhook Deliveries**

1. Go to Nylas Dashboard → "Webhooks"
2. Click on your webhook
3. View "Recent Deliveries"
4. Check for errors

### **9.3 Common Issues**

**Problem:** Webhook not firing
- ✅ Check Nylas Dashboard → Webhooks → Recent Deliveries
- ✅ Verify webhook URL is correct
- ✅ Check Edge Function logs

**Problem:** OAuth fails
- ✅ Check redirect URI matches exactly
- ✅ Verify Google/Microsoft credentials in Nylas
- ✅ Check OAuth consent screen is configured

**Problem:** Emails not syncing
- ✅ Check Edge Function logs: `supabase functions logs nylas-webhook`
- ✅ Verify NYLAS_API_KEY is set
- ✅ Check email_accounts table has nylas_grant_id

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│  Email Provider (Gmail/Outlook)                 │
│  - New email arrives                            │
│  - Calendar event created                       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  Nylas (Unified API)                            │
│  - Monitors all connected accounts              │
│  - Detects changes in real-time                 │
│  - Sends webhook to your app                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  Supabase Edge Function (nylas-webhook)         │
│  - Receives webhook notification                │
│  - Processes email/calendar delta               │
│  - Updates Supabase database                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  Supabase Database                              │
│  - emails table updated                         │
│  - appointments table updated                   │
│  - Triggers Realtime updates                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  Your App UI (React)                            │
│  - Subscribes to Realtime changes               │
│  - Shows new emails/events instantly            │
│  - NO SYNC BUTTON NEEDED                        │
└─────────────────────────────────────────────────┘
```

---

## 💰 Nylas Pricing

### **Free Tier:**
- ✅ 5 connected accounts
- ✅ All features included
- ✅ Webhooks included
- ✅ Perfect for testing

### **Paid Plans:**
- **Starter:** $12/month per account
- **Pro:** $25/month per account
- **Enterprise:** Custom pricing

### **Recommendation:**
- Start with **Free Tier** for testing
- Upgrade to **Starter** when you have paying customers
- Pass the cost to customers ($10-15/user/month)

---

## 🎯 Benefits Summary

### **Technical Benefits:**
✅ **One API** instead of multiple OAuth flows
✅ **Auto-sync** with webhooks (no manual sync)
✅ **Real-time** updates (instant)
✅ **Unified** data model (same code for all providers)
✅ **Simpler** codebase (less code to maintain)

### **Business Benefits:**
✅ **Better UX** - users don't click "Sync"
✅ **More reliable** - battle-tested at scale
✅ **Faster development** - less code to write
✅ **Lower maintenance** - Nylas handles complexity
✅ **Professional** - same tech used by major apps

---

## 🔐 Security Notes

### **Important:**
1. ✅ Nylas handles OAuth tokens securely
2. ✅ Webhook signatures verify authenticity
3. ✅ Row Level Security enforces permissions
4. ✅ Access tokens encrypted by Nylas
5. ✅ No tokens stored in frontend

### **Best Practices:**
- Keep NYLAS_API_KEY secret
- Verify webhook signatures in production
- Use HTTPS for all endpoints
- Encrypt sensitive data in database
- Regularly rotate API keys

---

## ✅ Deployment Checklist

**Before Deployment:**
- [ ] Nylas account created
- [ ] Google Cloud project configured
- [ ] Azure app configured (if using Outlook)
- [ ] Webhook configured in Nylas
- [ ] Edge Functions deployed
- [ ] Secrets configured in Supabase
- [ ] Database migrations applied

**After Deployment:**
- [ ] Test OAuth connection
- [ ] Test email sync (incoming)
- [ ] Test email send (outgoing)
- [ ] Test calendar sync (incoming)
- [ ] Test calendar create (outgoing)
- [ ] Verify webhooks firing
- [ ] Check Edge Function logs
- [ ] Monitor for errors

---

## 📚 Additional Resources

**Nylas Documentation:**
- https://developer.nylas.com/docs/
- https://developer.nylas.com/docs/v3/quickstart/

**Supabase Edge Functions:**
- https://supabase.com/docs/guides/functions

**Support:**
- Nylas Support: support@nylas.com
- Supabase Discord: https://discord.supabase.com/

---

## 🚀 Quick Deploy Commands

**Copy/paste this for fast deployment:**

```bash
# 1. Deploy Edge Functions
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-webhook
supabase functions deploy nylas-sync-emails
supabase functions deploy nylas-sync-calendar
supabase functions deploy nylas-create-event
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

**You're ready to deploy!** 🎉

Follow this guide step-by-step and you'll have full email + calendar sync with auto-updates via webhooks. No manual sync buttons needed!
