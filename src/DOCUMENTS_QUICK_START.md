# Documents Module - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Run the Database Migration

**Option A: Via Supabase Dashboard (Recommended)**

1. Open your Supabase project: https://supabase.com/dashboard
2. Go to **SQL Editor** (left sidebar)
3. Open the file `/supabase/migrations/20241119000001_documents.sql`
4. Copy the entire SQL content
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for "Success. No rows returned" message

**Option B: Via Supabase CLI**

```bash
# If you have Supabase CLI installed
supabase db push
```

### Step 2: Verify the Setup

1. Go to **Table Editor** in Supabase Dashboard
2. Confirm the `documents` table exists
3. Go to **Storage** in Supabase Dashboard  
4. Confirm the `documents` bucket exists (should be Private)

### Step 3: Start Using Documents

1. Navigate to **Documents** in ProSpaces CRM (left sidebar)
2. Click **Upload Document**
3. Select a file and fill in the metadata
4. Click Upload!

---

## ✅ What Was Created

### Database Objects
- ✅ `documents` table with 15+ columns
- ✅ 8 indexes for performance
- ✅ 4 RLS policies for security
- ✅ 1 trigger for auto-updating timestamps

### Storage
- ✅ `documents` storage bucket
- ✅ 4 storage policies for multi-tenant access

### Permissions
- ✅ Module permissions for all user roles
- ✅ View, Add, Change, Delete actions configured

### Frontend
- ✅ Documents.tsx component (main UI)
- ✅ DocumentDetail.tsx component (detail view)
- ✅ documents-client.ts (API functions)
- ✅ Navigation menu item added
- ✅ Routing configured

---

## 📋 Migration SQL Summary

The migration creates:

```sql
-- 1. Storage bucket for files
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- 2. Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  tags TEXT[],
  category TEXT,
  contact_id UUID,
  contact_name TEXT,
  version INTEGER DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT true,
  parent_document_id UUID,
  uploaded_by UUID,
  uploaded_by_name TEXT,
  organization_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes (8 total)
-- 4. RLS Policies (8 total - 4 for table, 4 for storage)
-- 5. Permissions for all roles
-- 6. Triggers for auto-updates
```

---

## 🎯 Supported File Types

Out of the box, the Documents module supports:

- **Documents:** PDF, DOC, DOCX, TXT
- **Spreadsheets:** XLS, XLSX
- **Presentations:** PPT, PPTX
- **Images:** JPG, JPEG, PNG, GIF

To add more file types, edit `/components/Documents.tsx` line ~330:

```tsx
accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip"
```

---

## 🔒 Default Permissions

| Role | View | Upload | Edit | Delete |
|------|------|--------|------|--------|
| Super Admin | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ❌ |
| Marketing | ✅ | ✅ | ❌ | ❌ |
| Standard User | ✅ | ✅ | ❌ | ❌ |

*Can be customized via the Permissions Manager*

---

## 📂 File Storage Structure

Files are organized by organization:

```
documents/
  └── {organization-uuid}/
      └── {timestamp}_{filename}
```

Example:
```
documents/
  └── 550e8400-e29b-41d4-a716-446655440000/
      ├── 1700000000000_contract.pdf
      ├── 1700000001000_invoice.xlsx
      └── 1700000002000_proposal.docx
```

---

## 🐛 Common Issues & Solutions

### Issue: "relation documents does not exist"

**Cause:** Migration not run yet  
**Solution:** Run the migration SQL from Step 1

### Issue: "storage bucket documents not found"

**Cause:** Bucket creation failed or was skipped  
**Solution:** 
1. Go to Storage in Supabase Dashboard
2. Click "New bucket"
3. Name it `documents`
4. Set to **Private**
5. Re-run the storage policies from migration SQL

### Issue: "permission denied for table documents"

**Cause:** RLS policies not applied  
**Solution:** Re-run the RLS policy section of the migration SQL

### Issue: Can't see Documents menu item

**Cause:** Permissions not loaded  
**Solution:** 
1. Refresh the page
2. Check browser console for errors
3. Verify permissions table has `documents` module entries

---

## 🎨 UI Features

### Search & Filter
- **Search bar** - Searches across filename, title, description, contact, tags
- **Category dropdown** - Filter by document category
- **Contact dropdown** - Filter by associated contact

### Table View
- **File icons** - Visual indicators for file types (PDF, Word, Excel, etc.)
- **Inline actions** - View, Download, Edit, Delete from table
- **Pagination** - 50 documents per page
- **Responsive** - Works on mobile and desktop

### Upload Dialog
- **File picker** - Standard file input
- **Auto-fill title** - Pre-fills from filename
- **Contact association** - Link to existing contacts
- **Tags** - Comma-separated for easy organization
- **Categories** - Custom categorization

---

## 📊 Next Steps

After setup, consider:

1. **Upload test documents** - Try different file types
2. **Create categories** - Establish naming conventions (e.g., "Contracts", "Invoices", "Proposals")
3. **Associate with contacts** - Link important docs to contacts
4. **Set up tags** - Define common tags for your organization
5. **Configure permissions** - Adjust role-based access if needed
6. **Train your team** - Show users how to upload and organize documents

---

## 🔮 Future Enhancements (Phase 2)

Planned features for future releases:

- 📧 **Email Integration** - Auto-import attachments from email
- 🔍 **Full-Text Search** - OCR and content indexing
- 🔄 **Versioning** - Track document changes over time
- 🏷️ **Auto-Tagging** - ML-powered tag suggestions
- 📈 **Analytics** - Track views, downloads, and usage
- 🔗 **Public Links** - Share documents externally
- 💬 **Comments** - Collaborate on documents
- 📱 **Mobile App** - Native mobile access

---

## 📞 Need Help?

If you run into issues:

1. Check the console for errors (F12 in browser)
2. Review Supabase logs in the dashboard
3. Verify RLS policies are applied
4. Ensure storage bucket exists
5. Check user has `organizationId` in metadata

For detailed troubleshooting, see `/DOCUMENTS_MODULE_SETUP.md`

---

**Happy Document Managing! 📄**
