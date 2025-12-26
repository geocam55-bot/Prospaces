# 🚀 Deploy Email Module Updates

## ⚠️ IMPORTANT: Run Migration FIRST!

You're seeing this error because the database doesn't have the new columns yet:
```
Error: column "labels" does not exist
```

**You MUST run the SQL migration before using the updated Email module.**

---

## 📋 Step-by-Step Deployment

### **Step 1: Run the SQL Migration**

Choose ONE method:

#### **Option A: Via Supabase Dashboard** (RECOMMENDED for web-only workflow)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your ProSpaces CRM project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste Migration**
   - Open `/supabase/migrations/20241226000001_email_folders_update.sql`
   - Copy the ENTIRE file contents
   - Paste into the SQL Editor

4. **Run the Migration**
   - Click "Run" button
   - Wait for "Success" message
   - You should see output like:
     ```
     ALTER TABLE
     ALTER TABLE
     CREATE INDEX
     CREATE INDEX
     ... etc
     ```

#### **Option B: Via Supabase CLI** (if you have it installed locally)

```bash
# From your project root
supabase db push
```

#### **Option C: Manual SQL Commands** (if you prefer step-by-step)

Run these in SQL Editor in order:

```sql
-- 1. Update folder constraint
ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_folder_check;
ALTER TABLE emails ADD CONSTRAINT emails_folder_check 
CHECK (folder IN ('inbox', 'sent', 'drafts', 'trash', 'archive', 'spam', 'important'));

-- 2. Add new columns
ALTER TABLE emails ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT false;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS labels TEXT[];
ALTER TABLE emails ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' 
  CHECK (priority IN ('low', 'normal', 'high'));
ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_emails_is_starred ON emails(is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_emails_folder_received ON emails(folder, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_labels ON emails USING GIN(labels) WHERE labels IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_is_flagged ON emails(is_flagged) WHERE is_flagged = true;

-- 4. Add comments
COMMENT ON COLUMN emails.folder IS 'Email folder: inbox, sent, drafts, trash, archive, spam, important';
COMMENT ON COLUMN emails.is_starred IS 'Starred/important emails';
COMMENT ON COLUMN emails.is_flagged IS 'Flagged emails for follow-up';
COMMENT ON COLUMN emails.priority IS 'Email priority: low, normal, high';
COMMENT ON COLUMN emails.labels IS 'Array of custom labels/categories';
COMMENT ON COLUMN emails.has_attachments IS 'Whether email has attachments';
```

---

### **Step 2: Verify Migration Success**

Run this query in SQL Editor to confirm:

```sql
-- Check new columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'emails' 
AND column_name IN ('has_attachments', 'labels', 'priority', 'is_flagged');
```

**Expected output:**
```
column_name      | data_type      | column_default
-----------------+----------------+---------------
has_attachments  | boolean        | false
labels           | ARRAY          | NULL
priority         | text           | 'normal'::text
is_flagged       | boolean        | false
```

---

### **Step 3: Deploy Frontend to Vercel**

Now that the database is ready, deploy the frontend:

1. **Commit changes to GitHub:**
   ```bash
   git add .
   git commit -m "Add advanced Email features: folders sidebar and context menu"
   git push origin main
   ```

2. **Vercel will auto-deploy** (if auto-deploy is enabled)
   - Or manually trigger deploy from Vercel dashboard

---

### **Step 4: Test the Features**

After deployment, test:

1. **Folder Sidebar:**
   - ✅ See 8 folders on the left (Inbox, Starred, Flagged, Sent, Drafts, Archive, Spam, Trash)
   - ✅ Email counts appear next to each folder
   - ✅ Active folder is highlighted in blue

2. **Right-Click Context Menu:**
   - ✅ Right-click any email
   - ✅ See menu with options (Mark as Read, Star, Flag, Move to...)
   - ✅ Click an option and confirm it works

3. **Email Indicators:**
   - ✅ Star icon appears on starred emails (yellow star)
   - ✅ Flag icon appears on flagged emails (red flag)

---

## 🔍 Troubleshooting

### Error: "column does not exist"
- **Cause:** Migration not run yet
- **Fix:** Run Step 1 above

### Error: "constraint already exists"
- **Cause:** Migration already ran
- **Fix:** Safe to ignore, or use `DROP CONSTRAINT IF EXISTS` first

### No folders appearing
- **Cause:** No email account selected
- **Fix:** Select an account from the dropdown

### Context menu not showing
- **Cause:** Right-click not working
- **Fix:** Try Ctrl+Click on Mac, or regular click + hold

---

## 📊 Migration Details

**New Database Columns:**
- `has_attachments` (BOOLEAN) - Track attachments
- `is_flagged` (BOOLEAN) - Flag emails
- `priority` (TEXT) - Email priority
- `labels` (TEXT[]) - Custom labels

**New Indexes:**
- `idx_emails_is_starred` - Fast starred email queries
- `idx_emails_is_read` - Fast unread email queries
- `idx_emails_folder_received` - Fast folder+date queries
- `idx_emails_is_flagged` - Fast flagged email queries
- `idx_emails_labels` - GIN index for label searches

**Updated Folder Constraint:**
- Old: `inbox`, `sent`, `drafts`, `trash`, `archive`
- New: `inbox`, `sent`, `drafts`, `trash`, `archive`, `spam`, `important`

---

## ✅ Deployment Checklist

- [ ] Step 1: Run SQL migration in Supabase Dashboard
- [ ] Step 2: Verify migration with test query
- [ ] Step 3: Commit and push to GitHub
- [ ] Step 4: Wait for Vercel deployment
- [ ] Step 5: Test all features in production

---

## Need Help?

If you encounter issues:
1. Check Supabase logs (Database → Logs)
2. Check Vercel deployment logs
3. Check browser console for JavaScript errors
4. Verify migration ran successfully with test query above
