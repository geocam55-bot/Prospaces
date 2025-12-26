# Email Module Advanced Features - SQL Migration

## Overview
This migration adds advanced email folder management and metadata support to match Outlook/Gmail functionality.

## Migration File
`/supabase/migrations/20241226000001_email_folders_update.sql`

## Changes Made

### 1. **Expanded Folder Types**
Added support for additional folders:
- `spam` - Spam/Junk emails
- `important` - Important/Priority emails (in addition to starred)

Existing folders maintained:
- `inbox` - Incoming emails
- `sent` - Sent emails  
- `drafts` - Draft emails
- `archive` - Archived emails
- `trash` - Deleted emails

### 2. **New Email Metadata Columns**

#### `has_attachments` (BOOLEAN)
- Indicates if email has attachments
- Default: false
- Indexed for fast filtering

#### `labels` (TEXT[])
- Array of custom labels/categories
- Supports Gmail-style labels
- GIN indexed for array operations

#### `priority` (TEXT)
- Email priority level: 'low', 'normal', 'high'
- Default: 'normal'
- CHECK constraint ensures valid values

#### `is_flagged` (BOOLEAN)
- Flag for follow-up/important
- Default: false
- Indexed for fast filtering

### 3. **Performance Indexes**

```sql
-- Starred emails index
CREATE INDEX idx_emails_is_starred ON emails(is_starred) WHERE is_starred = true;

-- Unread emails index  
CREATE INDEX idx_emails_is_read ON emails(is_read) WHERE is_read = false;

-- Folder + date composite index
CREATE INDEX idx_emails_folder_received ON emails(folder, received_at DESC);

-- Labels array index
CREATE INDEX idx_emails_labels ON emails USING GIN(labels);

-- Flagged emails index
CREATE INDEX idx_emails_is_flagged ON emails(is_flagged) WHERE is_flagged = true;
```

## Deployment Instructions

### Option 1: Automatic (via Supabase CLI)
```bash
# From project root
supabase db push
```

### Option 2: Manual (via Supabase Dashboard)
1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Copy contents of migration file
4. Execute SQL

### Option 3: Individual SQL Commands
Run these commands in order:

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
```

## Features Enabled

### 1. **Folder Sidebar**
- Visual folder navigation (Inbox, Starred, Flagged, Sent, Drafts, Archive, Spam, Trash)
- Real-time email counts per folder
- Active folder highlighting

### 2. **Right-Click Context Menu**
Users can right-click on any email to:
- Mark as read/unread
- Star/unstar
- Flag/unflag for follow-up
- Move to any folder (Inbox, Archive, Spam, Trash)
- Permanently delete

### 3. **Enhanced Email Display**
- Flag indicators (red flag icon)
- Star indicators (yellow star icon)
- Attachment indicators (paperclip icon)
- Priority markers (future enhancement)

### 4. **Database Support for Future Features**
- Custom labels (Gmail-style)
- Priority sorting
- Attachment management

## Testing the Migration

After deployment, verify:

```sql
-- Check new columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'emails' 
AND column_name IN ('has_attachments', 'labels', 'priority', 'is_flagged');

-- Check indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'emails' 
AND indexname LIKE 'idx_emails_%';

-- Check folder constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conname = 'emails_folder_check';
```

## Rollback (If Needed)

```sql
-- Remove new columns
ALTER TABLE emails DROP COLUMN IF EXISTS has_attachments;
ALTER TABLE emails DROP COLUMN IF EXISTS labels;
ALTER TABLE emails DROP COLUMN IF EXISTS priority;
ALTER TABLE emails DROP COLUMN IF EXISTS is_flagged;

-- Drop new indexes
DROP INDEX IF EXISTS idx_emails_is_starred;
DROP INDEX IF EXISTS idx_emails_is_read;
DROP INDEX IF EXISTS idx_emails_folder_received;
DROP INDEX IF EXISTS idx_emails_labels;
DROP INDEX IF EXISTS idx_emails_is_flagged;

-- Restore original folder constraint
ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_folder_check;
ALTER TABLE emails ADD CONSTRAINT emails_folder_check 
CHECK (folder IN ('inbox', 'sent', 'drafts', 'trash', 'archive'));
```

## Notes

- All changes are backward compatible
- Existing emails will have default values for new columns
- RLS policies remain unchanged
- No data loss or migration required
- Indexes are partial where appropriate for performance
