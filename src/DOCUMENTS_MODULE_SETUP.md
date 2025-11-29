# Documents Module Setup Guide

## Overview
The Documents module has been successfully created for ProSpaces CRM. This module provides secure, multi-tenant document management with contact associations, search, filtering, and role-based access control.

## 🎯 Features Implemented

### Core Functionality
- ✅ **File Upload** - Drag-and-drop or file picker with support for PDF, DOCX, XLSX, PPT, images, and more
- ✅ **Contact Association** - Link documents to specific contacts
- ✅ **Metadata Management** - Title, description, category, and tags for each document
- ✅ **Search & Filter** - Search by filename, title, description, tags, or contact name
- ✅ **Category Filtering** - Quick filter by document category
- ✅ **Contact Filtering** - View documents for specific contacts
- ✅ **Download & View** - Securely download or preview documents
- ✅ **Edit Metadata** - Update document information without re-uploading
- ✅ **Delete Documents** - Remove documents and associated files from storage
- ✅ **Pagination** - Handle large document libraries efficiently (50 items per page)
- ✅ **File Icons** - Visual indicators for different file types
- ✅ **Responsive Design** - Works on desktop and mobile devices

### Security & Multi-Tenancy
- ✅ **Row-Level Security (RLS)** - Documents isolated by organization
- ✅ **Storage Bucket Policies** - Files organized by organization folder
- ✅ **Role-Based Permissions** - Access control based on user roles
- ✅ **Secure File URLs** - Signed URLs with expiration for downloads

### Future Enhancements (Phase 2)
- 🔄 Email Integration - Automatic document ingestion from email
- 🔄 Full-Text Search - OCR and content indexing
- 🔄 Document Versioning - Track changes and allow rollback
- 🔄 Auto-Tagging - ML/NLP-powered tag suggestions
- 🔄 Analytics Dashboard - Document views, downloads, and activity tracking

---

## 📋 Database Setup Instructions

### Step 1: Run the Migration

The migration file has been created at `/supabase/migrations/20241119000001_documents.sql`

**To apply the migration:**

1. **Via Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**
   - Copy the contents of `20241119000001_documents.sql`
   - Paste and run the SQL

2. **Via Supabase CLI:**
   ```bash
   supabase db push
   ```

### Step 2: Verify the Setup

After running the migration, verify that the following were created:

#### Tables
- ✅ `documents` table with all required columns
- ✅ Indexes for performance optimization
- ✅ RLS policies for multi-tenant security

#### Storage
- ✅ `documents` storage bucket
- ✅ Storage policies for organization-based access

#### Permissions
- ✅ `documents` module permissions added to all organizations

### Step 3: Check Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Verify the `documents` bucket exists
3. Check that it's set to **Private** (not public)

---

## 🗄️ Database Schema

### Documents Table

```sql
documents (
  id UUID PRIMARY KEY,
  
  -- File Information
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  
  -- Document Metadata
  title TEXT,
  description TEXT,
  tags TEXT[],
  category TEXT,
  
  -- Associations
  contact_id UUID REFERENCES contacts(id),
  contact_name TEXT,
  
  -- Versioning (for future use)
  version INTEGER DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT true,
  parent_document_id UUID REFERENCES documents(id),
  
  -- Audit Fields
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_name TEXT,
  organization_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### Indexes Created

- `idx_documents_organization_id` - Fast queries by organization
- `idx_documents_contact_id` - Fast queries by contact
- `idx_documents_uploaded_by` - Fast queries by uploader
- `idx_documents_created_at` - Chronological sorting
- `idx_documents_category` - Category filtering
- `idx_documents_search` - Full-text search on title/description
- `idx_documents_tags` - Tag-based search

---

## 🔐 Permissions Matrix

The following permissions are set by default:

| Role | View | Add | Edit | Delete |
|------|------|-----|------|--------|
| **Super Admin** | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ✅ | ❌ |
| **Marketing** | ✅ | ✅ | ❌ | ❌ |
| **Standard User** | ✅ | ✅ | ❌ | ❌ |

*Permissions can be customized via the Permissions Manager in the CRM*

---

## 📁 File Organization

Documents are stored in Supabase Storage with the following structure:

```
documents/
  └── {organization_id}/
      └── {timestamp}_{sanitized_filename}
```

**Example:**
```
documents/
  └── 550e8400-e29b-41d4-a716-446655440000/
      ├── 1700000000000_contract_signed.pdf
      ├── 1700000001000_invoice_Q4_2024.xlsx
      └── 1700000002000_proposal_acme_corp.docx
```

This ensures:
- ✅ **Multi-tenant isolation** - Each organization's files are separate
- ✅ **Unique filenames** - Timestamps prevent filename collisions
- ✅ **Easy cleanup** - Can delete all files for an organization if needed

---

## 🚀 Usage Guide

### Uploading Documents

1. Click **Upload Document** button
2. Select a file (PDF, DOCX, XLSX, images, etc.)
3. Fill in metadata:
   - **Title** - Display name (auto-filled from filename)
   - **Description** - Brief description of the document
   - **Contact** - Optional link to a contact
   - **Category** - e.g., "Contract", "Invoice", "Proposal"
   - **Tags** - Comma-separated tags for organization
4. Click **Upload**

### Viewing Documents

- Click the **Eye icon** to preview the document in a new tab
- Click the **Download icon** to download the file

### Editing Document Details

1. Click the **⋮** (More) menu on a document row
2. Select **Edit Details**
3. Update metadata (title, description, contact, category, tags)
4. Click **Save Changes**

*Note: You cannot change the actual file - only metadata. To replace a file, delete and re-upload.*

### Deleting Documents

1. Click the **⋮** (More) menu on a document row
2. Select **Delete**
3. Confirm the deletion

*This will delete both the file from storage and the metadata record.*

### Searching & Filtering

- **Search Bar** - Searches filename, title, description, contact name, and tags
- **Category Filter** - Filter by document category
- **Contact Filter** - Show documents for a specific contact

---

## 🔧 Technical Details

### Files Created

```
/components/Documents.tsx          - Main documents module UI
/utils/documents-client.ts         - Supabase client functions
/supabase/migrations/20241119000001_documents.sql - Database migration
```

### Files Modified

```
/App.tsx                           - Added Documents lazy import and routing
/components/Navigation.tsx         - Added Documents menu item
```

### API Functions (documents-client.ts)

- `getAllDocumentsClient(contactId?)` - Get all documents, optionally filtered by contact
- `uploadDocumentClient(file, metadata)` - Upload file to storage and create metadata record
- `updateDocumentClient(id, updates)` - Update document metadata
- `deleteDocumentClient(id)` - Delete file and metadata
- `downloadDocumentClient(filePath)` - Get file blob for download
- `getDocumentUrlClient(filePath, expiresIn)` - Get signed URL for viewing
- `getDocumentVersionsClient(parentDocumentId)` - Get all versions of a document (future)

---

## 🐛 Troubleshooting

### Issue: "Storage bucket not found"

**Solution:**
1. Go to Supabase Dashboard → Storage
2. Manually create a bucket called `documents`
3. Set it to **Private**
4. Re-run the storage policies from the migration SQL

### Issue: "Permission denied" when uploading

**Solution:**
1. Check that RLS is enabled on the `documents` table
2. Verify storage policies are applied to the `documents` bucket
3. Ensure user's `organizationId` is set in their user metadata

### Issue: Files not visible to other users in same organization

**Solution:**
1. Verify RLS policies on `documents` table
2. Check that `organization_id` is correctly set on document records
3. Confirm all users have the same `organizationId` in their user metadata

### Issue: Download URLs expire too quickly

**Solution:**
The default expiration is 1 hour (3600 seconds). To increase:

```typescript
// In components/Documents.tsx, update:
const url = await getDocumentUrlClient(doc.filePath, 7200); // 2 hours
```

---

## 🎨 Customization

### Supported File Types

To add or remove file types, update the `accept` attribute in `/components/Documents.tsx`:

```tsx
<Input
  type="file"
  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
/>
```

### File Size Limits

Supabase has a default file size limit of **50MB** per file. To modify:

1. Update Supabase project settings
2. Add client-side validation in `handleFileSelect()`:

```tsx
if (file.size > 50 * 1024 * 1024) {
  toast.error('File size must be less than 50MB');
  return;
}
```

### Items Per Page

To change pagination size, update in `/components/Documents.tsx`:

```tsx
const itemsPerPage = 100; // Default is 50
```

---

## 📊 Analytics & Reporting

Currently, basic document statistics are available:
- Total documents count
- Documents per contact
- Documents per category

**Future Analytics Features:**
- Document views and downloads tracking
- Most accessed documents
- Storage usage by organization
- Document activity timeline
- User upload statistics

---

## 🔒 Security Best Practices

1. ✅ **All files are private by default** - No public access
2. ✅ **Signed URLs expire** - Links are temporary (1 hour default)
3. ✅ **Multi-tenant isolation** - Organizations cannot see each other's files
4. ✅ **Role-based access** - Permissions enforce who can upload/edit/delete
5. ⚠️ **PII Warning** - Do not store sensitive personal information or regulated data

---

## 📝 Next Steps

1. **Run the migration** to set up the database and storage
2. **Test the upload flow** with various file types
3. **Configure permissions** for your organization's roles
4. **Train users** on how to use the document management system
5. **Consider implementing** Phase 2 features based on your needs

---

## 🆘 Support

If you encounter any issues:

1. Check the browser console for error messages
2. Review the Supabase logs in the dashboard
3. Verify RLS policies are correctly applied
4. Ensure storage bucket exists and has correct policies
5. Check that user has correct `organizationId` in metadata

---

## 📄 License & Credits

Part of **ProSpaces CRM** - Multi-tenant CRM Platform
Built with React, TypeScript, Tailwind CSS, and Supabase
