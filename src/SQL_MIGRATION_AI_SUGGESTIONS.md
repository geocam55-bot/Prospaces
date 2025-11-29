# SQL Migration: AI Suggestions Feature Flag

Run this SQL in your Supabase SQL Editor to add the AI Suggestions feature flag to organizations:

```sql
-- Add ai_suggestions_enabled column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS ai_suggestions_enabled BOOLEAN DEFAULT false;

-- Enable AI Suggestions for all existing organizations (optional)
-- Comment out the next line if you want to enable it manually per organization
-- UPDATE organizations SET ai_suggestions_enabled = true WHERE status = 'active';

-- Enable for a specific organization by ID
-- UPDATE organizations SET ai_suggestions_enabled = true WHERE id = 'your-org-id';
```

## How to Use:

1. **Super Admin**: Go to "Organizations" in the CRM
2. Click "Edit" on an organization
3. Toggle "AI Suggestions Enabled" on or off
4. Click "Update Organization"

Only organizations with AI Suggestions enabled will see the AI Suggestions menu item in the navigation.

## Features Controlled by This Flag:

- **AI Suggestions** menu item visibility
- **Daily task recommendations** based on CRM data
- **Follow-up suggestions** for inactive items
- **Email templates** for quick outreach
- **Task creation** directly from suggestions
- **Priority scoring** for urgent actions
