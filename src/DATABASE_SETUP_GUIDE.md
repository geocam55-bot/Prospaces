# ProSpaces CRM - Database Setup Guide

## Problem Fixed

The application was throwing errors because core database tables (like `contacts`, `tasks`, `opportunities`, etc.) were missing from your Supabase database.

## Solution Implemented

We've created a **Full CRM Database Setup** screen that automatically appears when core tables are missing.

### What Happens Now

1. **When you log in**, the app checks if the `contacts` table exists
2. **If tables are missing**, you'll see a beautiful setup screen with complete SQL script
3. **The screen includes**:
   - Complete SQL script to create ALL CRM tables
   - Copy button for easy clipboard access
   - Direct link to Supabase SQL Editor
   - Step-by-step instructions
   - Visual guide of what tables will be created

### Tables Created by the Script

#### Core Tables
- ✅ **organizations** - Multi-tenant organization data
- ✅ **profiles** - User profiles and authentication
- ✅ **permissions** - Role-based access control

#### CRM Feature Tables
- ✅ **contacts** - Customer/contact management
- ✅ **project_managers** - Project manager assignments
- ✅ **opportunities** - Sales opportunity tracking
- ✅ **bids** - Bid management (linked to opportunities)
- ✅ **tasks** - Task management
- ✅ **notes** - Notes and documentation
- ✅ **appointments** - Calendar and scheduling
- ✅ **inventory** - Product/inventory management
- ✅ **files** - File attachments and documents

#### Marketing Automation Tables
- ✅ **campaigns** - Marketing campaign management
- ✅ **leads** - Lead tracking and scoring

#### System Tables
- ✅ **audit_logs** - Activity tracking and auditing

### Security Features

The script includes:
- **Row Level Security (RLS)** policies for all tables
- **Multi-tenant data isolation** via organization_id
- **Role-based permissions** (super_admin, admin, manager, marketing, standard_user)
- **Proper indexes** for optimal query performance

### How to Use

1. Log into your ProSpaces CRM
2. If tables are missing, you'll see the setup screen
3. Click **"Open SQL Editor"** (opens Supabase dashboard)
4. Click **"Copy SQL"** to copy the script
5. Paste into Supabase SQL Editor
6. Click **"Run"**
7. Wait for success message
8. Refresh the page - your CRM is ready!

### Default Organization

The script creates a default organization called "ProSpaces CRM" with ID `default-org`. All existing users will be automatically synced to this organization.

### What's Different From Before

**Before**: Individual table setup scripts scattered across multiple components
**Now**: Single, comprehensive script that sets up the ENTIRE database in one go

### Files Modified

1. **`/components/FullCRMDatabaseSetup.tsx`** - New comprehensive setup component
2. **`/App.tsx`** - Added database check on authentication
   - Checks if `contacts` table exists
   - Shows setup screen if tables are missing
   - Automatic detection and user guidance

### Next Steps After Setup

Once the database is initialized:
1. You can start creating contacts
2. Add opportunities and bids
3. Manage tasks and appointments
4. Use marketing automation features
5. All role-based permissions will be enforced

### Troubleshooting

**If you still see errors after running the script:**
1. Check Supabase SQL Editor for error messages
2. Ensure you're connected to the correct Supabase project
3. Verify you have proper database permissions
4. Try refreshing the page

**If the setup screen doesn't appear:**
- The tables may already exist
- Check your Supabase database tables manually

### Support

If you need help, check:
- Supabase project settings
- Database logs in Supabase dashboard
- RLS policies in Table Editor

---

**✅ Your ProSpaces CRM is now ready for a complete database setup!**
