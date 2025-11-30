# 🌐 Deploy IMAP/SMTP Email via Supabase Dashboard (No Terminal!)

## ✅ For Cloud-Hosted Apps (Replit, StackBlitz, etc.)

Since your app is in the cloud, you can deploy using **Supabase Dashboard only** - no command line needed!

---

## 📋 **Step 1: Create Database Tables**

1. **Go to:** https://supabase.com/dashboard
2. **Open** your project: `usorqldwroecyxucmtuw`
3. Click **SQL Editor** (left sidebar)
4. Click **"+ New Query"**
5. **Copy and paste this SQL:**

```sql
-- Create email_accounts table
CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  email TEXT NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  grant_id TEXT,
  imap_config JSONB,
  smtp_config JSONB,
  connected BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  message_id TEXT,
  thread_id TEXT,
  subject TEXT,
  from_email TEXT,
  from_name TEXT,
  to_recipients JSONB,
  cc_recipients JSONB,
  bcc_recipients JSONB,
  body_plain TEXT,
  body_html TEXT,
  date TIMESTAMPTZ,
  read BOOLEAN DEFAULT false,
  starred BOOLEAN DEFAULT false,
  folder TEXT DEFAULT 'inbox',
  labels JSONB,
  attachments JSONB,
  linked_contact_id UUID,
  linked_bid_id UUID,
  linked_task_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_org ON email_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_emails_account ON emails(account_id);
CREATE INDEX IF NOT EXISTS idx_emails_org ON emails(organization_id);
CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date DESC);
CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(folder);

-- Row Level Security (RLS)
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Policies for email_accounts
DROP POLICY IF EXISTS "Users can view their own email accounts" ON email_accounts;
CREATE POLICY "Users can view their own email accounts"
  ON email_accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own email accounts" ON email_accounts;
CREATE POLICY "Users can insert their own email accounts"
  ON email_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own email accounts" ON email_accounts;
CREATE POLICY "Users can update their own email accounts"
  ON email_accounts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own email accounts" ON email_accounts;
CREATE POLICY "Users can delete their own email accounts"
  ON email_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for emails
DROP POLICY IF EXISTS "Users can view emails from their accounts" ON emails;
CREATE POLICY "Users can view emails from their accounts"
  ON emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.account_id
      AND email_accounts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert emails to their accounts" ON emails;
CREATE POLICY "Users can insert emails to their accounts"
  ON emails FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.account_id
      AND email_accounts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update emails from their accounts" ON emails;
CREATE POLICY "Users can update emails from their accounts"
  ON emails FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.account_id
      AND email_accounts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete emails from their accounts" ON emails;
CREATE POLICY "Users can delete emails from their accounts"
  ON emails FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = emails.account_id
      AND email_accounts.user_id = auth.uid()
    )
  );
```

6. Click **"Run"** button
7. Wait for **"Success. No rows returned"**
8. ✅ Database tables created!

---

## 🔑 **Step 2: Set API Key Secret**

1. Still in **Supabase Dashboard**
2. Click **Settings** (left sidebar)
3. Click **Secrets**
4. Click **"+ New Secret"**
5. **Name:** `NYLAS_API_KEY`
6. **Value:** `nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv`
7. Click **"Add Secret"**
8. ✅ API Key set!

---

## 📤 **Step 3: Deploy Edge Functions**

**Unfortunately, Edge Functions MUST be deployed via CLI.** But don't worry! Here are your options:

### **Option A: Use Your Cloud Platform's Terminal** ⭐

Most cloud platforms have a built-in terminal:

**Replit:**
- Click "Shell" tab at bottom
- Terminal is ready!

**StackBlitz:**
- Click Terminal icon at bottom
- Terminal opens

**GitHub Codespaces:**
- Terminal → New Terminal
- Terminal is ready!

**CodeSandbox:**
- Click Terminal at bottom
- Terminal opens

Once you have terminal access, run:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref usorqldwroecyxucmtuw

# Deploy functions
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
```

---

### **Option B: Use GitHub Actions (Automated)**

If your code is on GitHub, I can help you set up automatic deployment.

---

### **Option C: Deploy from Local Computer (One-time)**

Even if your app runs in the cloud, you can:
1. Download/clone the project to your computer
2. Deploy functions once from your computer
3. Never need to do it again
4. App continues running in the cloud

**Would you like me to guide you through this?**

---

## ✅ **After Deployment**

Once functions are deployed:

1. **Open ProSpaces CRM** (your cloud URL)
2. **Go to Email** module
3. **Click "Add Account"**
4. **Select "IMAP/SMTP"**
5. **Get app password** from Gmail/Outlook/Yahoo (see CONNECT_YOUR_EMAIL.md)
6. **Enter settings** and connect
7. **✅ Done!**

---

## 📊 **Deployment Status Check**

After deploying, verify in **Supabase Dashboard**:

1. Go to **Database** → **Tables**
   - Should see: `email_accounts` and `emails`

2. Go to **Edge Functions**
   - Should see: 4 functions deployed

3. Go to **Settings** → **Secrets**
   - Should see: `NYLAS_API_KEY`

---

## 🆘 **Can't Access Terminal?**

If your cloud platform doesn't have a terminal, you have 2 options:

**Option 1:** Download project → Deploy locally once → Done
**Option 2:** Use GitHub + GitHub Actions for automated deployment

Let me know which works for you!
