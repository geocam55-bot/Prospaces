# Notes Table Schema Fix

## Problem Identified

The notes table had a schema mismatch between different setup files, causing "column not found" errors when trying to save notes.

### Schema Conflict

**SETUP_DATABASE.sql** (older schema):
```sql
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,          -- ✅ Has title field
  content text,
  contact_id uuid,
  owner_id uuid,                 -- Uses owner_id
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**NUCLEAR-FIX.sql** (current schema):
```sql
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  contact_id UUID,
  content TEXT NOT NULL,         -- ❌ No title field
  organization_id TEXT NOT NULL,
  created_by UUID,               -- Uses created_by instead of owner_id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Code Issues

The OpportunityChat component was sending:
```javascript
const noteData = {
  text: newMessage,  // ❌ Wrong field name - should be 'content'
};
```

But the actual database expects:
- `content` (not `text`, `title`, `module`, or `linkedTo`)
- `created_by` (not `owner_id`)

## Solution Implemented

### 1. Updated `createNoteClient` function in `/utils/notes-client.ts`

Added field mapping to handle both possible field names:

```javascript
const newNote = {
  content: noteData.text || noteData.content || noteData.message || '', // Map text/message to content
  contact_id: noteData.contact_id || null,
  organization_id: user.user_metadata?.organizationId,
  created_by: user.id,  // Use created_by (matches NUCLEAR-FIX.sql)
  created_at: new Date().toISOString(),
};
```

### 2. Enhanced Debugging

Added comprehensive logging to help diagnose schema issues:
```javascript
console.log('📋 Notes table schema check:');
console.log('  - Rows found:', schemaCheck?.length || 0);
console.log('  - Sample columns:', schemaCheck && schemaCheck.length > 0 ? Object.keys(schemaCheck[0]) : 'No existing rows to inspect');
```

### 3. Updated OpportunityChat Component

Changed from using sample messages to loading actual notes from the database:

**Before:**
```javascript
const sampleMessages: ChatMessage[] = [
  // Hardcoded sample data
];
```

**After:**
```javascript
// Load actual notes from database
const { notes } = await notesAPI.getAll();

// Convert notes to chat messages
loadedMessages = notes.map((note: any) => ({
  id: note.id,
  opportunityId,
  userId: note.created_by || note.owner_id,  // Handle both schemas
  userName: 'User',
  message: note.content || note.text || '',  // Handle both field names
  messageType: 'comment' as const,
  createdAt: note.created_at || note.createdAt
}));
```

### 4. Error Handling

Added better error handling to continue operation even if notes fail to load:

```javascript
try {
  const { notes } = await notesAPI.getAll();
  // ... convert to messages
} catch (notesError) {
  console.error('[OpportunityChat] Error loading notes:', notesError);
  // Continue with empty messages if notes fail to load
}
```

## Testing Next Steps

1. **Test Note Creation**: Try adding a comment in the Discussion tab of the Opportunity Details
2. **Check Console Logs**: Look for the schema debugging output:
   - `📋 Notes table schema check`
   - `📝 Attempting to insert note`
   - `✅ Note created successfully` (if successful)
   - `❌ Error creating note` (if failed, with detailed error info)

3. **Verify Database Schema**: If you still get errors, the logs will show exactly what columns exist in your database

## Expected Behavior

After this fix:
- ✅ Notes should save successfully to the database
- ✅ The Discussion tab should load existing notes
- ✅ New notes should appear in real-time after posting
- ✅ All notes are subject to role-based access control (already implemented in `getAllNotesClient`)

## If Issues Persist

If you still see column errors, the debugging logs will reveal the actual schema. You may need to:

1. Check which SQL file was actually run on your Supabase instance
2. Run a migration to align the schema with NUCLEAR-FIX.sql (recommended)
3. Or adjust the code to match your actual schema

The current fix is designed to be flexible and work with multiple field name variations.
