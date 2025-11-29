# Settings Supabase Migration

## Overview
The Settings component has been updated to save all settings data to Supabase instead of using localStorage. This ensures data persistence across devices and browsers.

## What Changed?

### Before ✗
- All settings were stored in **browser localStorage**
- Settings were lost when clearing browser data
- No sync across devices
- No centralized management

### After ✓
- All settings are stored in **Supabase database**
- Settings persist even after clearing browser data
- Settings sync across all devices
- Centralized management and backup
- localStorage is kept as a fallback for offline access

## Database Schema

Two new tables have been created:

### 1. `user_preferences`
Stores user-level preferences:
- User ID and Organization ID (composite primary key)
- Notification preferences (email, push, tasks, appointments, bids)
- Profile picture (base64 string)
- Timestamps (created_at, updated_at)

### 2. `organization_settings`
Stores organization-level settings:
- Organization ID (primary key)
- Tax rate (percentage)
- Default price level (Standard, Premium, Wholesale, Retail, Contractor)
- Organization name
- Timestamps (created_at, updated_at)

### 3. `profiles` table modification
- Added `profile_picture` column to store user profile pictures

## Setup Instructions

### Step 1: Create Database Tables
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `SUPABASE_SETTINGS_TABLES.sql`
4. Click **Run** to execute the script

This will:
- Create the `user_preferences` table
- Create the `organization_settings` table
- Add `profile_picture` column to `profiles` table
- Set up indexes for better performance
- Enable Row Level Security (RLS)
- Create RLS policies for data access control
- Create triggers for automatic timestamp updates

### Step 2: Verify Tables
Run this query in SQL Editor to verify:
```sql
SELECT * FROM user_preferences;
SELECT * FROM organization_settings;
SELECT column_name FROM information_schema.columns 
WHERE table_name='profiles' AND column_name='profile_picture';
```

### Step 3: Test the Application
1. Go to the Settings page
2. Update your profile picture
3. Change notification preferences
4. Update organization settings (if admin/super_admin)
5. Check the console for success messages
6. Refresh the page to verify settings persist

## API Functions Created

### User Preferences
- `getUserPreferencesClient(userId, organizationId)` - Fetch user preferences
- `upsertUserPreferencesClient(preferences)` - Save/update user preferences

### Organization Settings
- `getOrganizationSettingsClient(organizationId)` - Fetch org settings
- `upsertOrganizationSettingsClient(settings)` - Save/update org settings

### Profile Management
- `updateOrganizationNameClient(organizationId, name)` - Update org name
- `updateUserProfileClient(userId, updates)` - Update user profile

## Settings Component Changes

### New Features
1. **Auto-load on mount**: Settings are automatically loaded from Supabase when the component mounts
2. **Fallback to localStorage**: If Supabase fails, the component falls back to localStorage
3. **Loading state**: Added `isLoading` state to show loading indicator
4. **Better error handling**: All save operations have try-catch blocks with user feedback

### Updated Functions
- `handleProfilePictureUpload()` - Now saves to Supabase
- `handleRemoveProfilePicture()` - Now removes from Supabase
- `handleSaveProfile()` - Now saves to Supabase profiles table
- `handleSaveOrg()` - Now saves to Supabase organizations table
- `handleSaveNotifications()` - Now saves to Supabase user_preferences
- `handleSaveGlobalSettings()` - Now saves to Supabase organization_settings

## Security Features

### Row Level Security (RLS)
All tables have RLS enabled with the following policies:

**user_preferences:**
- Users can only view/edit their own preferences
- Policies enforce user_id = auth.uid()

**organization_settings:**
- All users can view their organization's settings
- Only admins and super_admins can create/update settings
- Only super_admins can delete settings

### Data Isolation
- Multi-tenant architecture ensures data isolation
- Each organization's data is completely separate
- Users can only access data for their organization

## Migration Path

For existing users with localStorage data:

1. **First login after migration**:
   - Component will try to load from Supabase
   - If no data exists, it falls back to localStorage
   - User can save settings to sync to Supabase

2. **Gradual migration**:
   - Old localStorage data will continue to work
   - When users save settings, they're written to both Supabase and localStorage
   - localStorage acts as a local cache

3. **Future cleanup**:
   - Once all users have migrated, localStorage can be deprecated
   - For now, it serves as a fallback mechanism

## Testing Checklist

- [ ] Profile picture upload works and persists
- [ ] Profile picture removal works
- [ ] Profile name update saves to database
- [ ] Notification preferences save and load correctly
- [ ] Organization name update works (admin only)
- [ ] Tax rate and price level save correctly (admin only)
- [ ] Settings persist after page refresh
- [ ] Settings sync across different browsers
- [ ] Error messages display for failed operations
- [ ] Success messages display for successful saves
- [ ] RLS policies prevent unauthorized access
- [ ] Super admin can access all organization settings
- [ ] Standard users cannot modify organization settings

## Troubleshooting

### Settings not saving
1. Check browser console for error messages
2. Verify Supabase tables exist
3. Verify RLS policies are correctly set
4. Check user authentication status
5. Verify organization_id matches in database

### Settings not loading
1. Check if tables have data (run SELECT queries)
2. Verify user_id and organization_id are correct
3. Check RLS policies allow SELECT
4. Check browser console for errors

### Profile picture not displaying
1. Verify base64 string is saved correctly
2. Check if profile_picture column exists in profiles table
3. Verify user_preferences table has the data
4. Check if image size is under 2MB

## Benefits

✅ **Persistence**: Data survives browser cache clears
✅ **Sync**: Works across all devices and browsers
✅ **Backup**: Data is backed up with your Supabase project
✅ **Security**: RLS policies protect user data
✅ **Scalability**: Can handle millions of users
✅ **Audit**: Timestamps track when settings were changed
✅ **Fallback**: localStorage provides offline capability

## Next Steps

1. Run the SQL script to create tables
2. Test the Settings page thoroughly
3. Monitor Supabase logs for any errors
4. Consider adding more settings in the future:
   - Dashboard layout preferences
   - Column visibility settings
   - Report customizations
   - Email templates
   - Workflow configurations
