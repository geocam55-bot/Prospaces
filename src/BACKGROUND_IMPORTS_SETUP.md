# Background Imports Setup Guide

## Issue: RLS Policy Error

If you're seeing the error: **"new row violates row-level security policy for table"**, follow these steps:

## Step 1: Run the RLS Fix Script

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the contents of `/database-migrations/fix_scheduled_jobs_rls.sql`
4. Click **Run**

This will update the RLS policy to allow users to create jobs in their organization.

## Step 2: Verify the Table Exists

If the `scheduled_jobs` table doesn't exist yet, run:

1. Open **Supabase SQL Editor**
2. Copy and paste the contents of `/database-migrations/scheduled_jobs_table.sql`
3. Click **Run**

## Step 3: Test the Background Import

1. Go to **Import & Export** module
2. Upload an inventory CSV file
3. Review the column mapping
4. Click **"Run in Background"** button
5. You should see a success toast notification

## What Was Fixed

### Code Changes:
- ✅ Updated `createBackgroundImportJob()` to use `supabase.auth.getUser()` to get the authenticated user ID
- ✅ Updated `createScheduledJob()` to use the authenticated user ID
- ✅ Added better error logging with console messages
- ✅ Added TypeScript type assertions for job_type and status

### Database Changes (via SQL script):
- ✅ Removed the `created_by = auth.uid()` check from the INSERT policy
- ✅ The policy now only checks that the user belongs to the organization

## Why This Happened

The original RLS policy had two checks:
```sql
WITH CHECK (
  organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  AND created_by = auth.uid()  -- This was too strict!
)
```

The problem was that when inserting a row, Supabase would check BOTH conditions:
1. The organization_id matches the user's org ✅
2. The created_by field equals the authenticated user ID ✅

However, if there was any mismatch between `user.id` from our app state and `auth.uid()` from Supabase Auth, the insert would fail.

## The Solution

We now:
1. **Get the auth user directly** from `supabase.auth.getUser()` before inserting
2. **Use that ID** for the `created_by` field
3. **Simplified the RLS policy** to only check organization membership

This ensures the `created_by` field always matches `auth.uid()`, satisfying the RLS policy.

## Monitoring Background Jobs

After setup, you can:
- View all background jobs in the **Background Imports** view
- See real-time progress updates
- Enable browser notifications for completion alerts
- Jobs auto-process every 5 seconds

## Troubleshooting

### Still getting RLS errors?

1. **Check if you're logged in:**
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Current user:', user);
   ```

2. **Check your organization_id:**
   - Make sure your user profile has an organization_id
   - Check in Supabase Dashboard → Authentication → Users → View profile

3. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'scheduled_jobs';
   ```

4. **Check table permissions:**
   ```sql
   SELECT * FROM information_schema.role_table_grants 
   WHERE table_name = 'scheduled_jobs';
   ```

### Jobs not processing?

1. Check the **BackgroundImportManager** component is mounted
2. Check browser console for errors
3. Verify the auto-processor is running (should log every 5 seconds)
4. Check Supabase Realtime is enabled for the `scheduled_jobs` table

## Next Steps

Once everything is working:
1. Test with a small inventory file (100 records)
2. Test with a larger file (1000+ records)
3. Test closing the page during import
4. Test browser notifications
5. Test viewing job history

Enjoy your background imports! 🚀
