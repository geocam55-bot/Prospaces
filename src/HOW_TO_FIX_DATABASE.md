# How to Fix the Database Error

## What You're Seeing

You're seeing this error because the ProSpaces CRM database tables don't exist yet:

```
Database check failed: {
  "code": "PGRST205",
  "message": "Could not find the table 'public.contacts' in the schema cache"
}
```

**This is expected and normal** - you just need to initialize your database!

## What Should Happen Now

When you refresh your browser, you should see:

1. **Loading screen** - "Checking database..."
2. **Database Setup Screen** - A beautiful purple/blue interface with:
   - Complete SQL script in a code block
   - "Copy SQL" button
   - "Open SQL Editor" button
   - Step-by-step instructions
   - "Refresh & Check Database" button

## If You See the Setup Screen

Great! Follow these steps:

### Step 1: Open Supabase
Click the **"Open SQL Editor"** button (opens in new tab)

### Step 2: Copy the SQL Script
Click the **"Copy SQL"** button
- If it doesn't work, manually select all the text (Ctrl+A or Cmd+A) and copy (Ctrl+C or Cmd+C)

### Step 3: Run in Supabase
1. Paste the script into the Supabase SQL Editor
2. Click **"Run"** 
3. Wait for success message (10-15 seconds)

### Step 4: Refresh
Click the **"Refresh & Check Database"** button on the setup screen

### Step 5: Done!
Your CRM will now load with all features working!

## If You DON'T See the Setup Screen

If you still see the dashboard but with errors, try:

1. **Hard refresh** your browser (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear browser cache** and reload
3. **Check console** - the setup screen should appear automatically

## What the SQL Script Creates

The script creates **all 16 CRM tables**:

✅ Organizations & Profiles
✅ Permissions & RLS Policies  
✅ Contacts & Project Managers
✅ Opportunities & Bids
✅ Tasks, Notes, Appointments
✅ Inventory & Files
✅ Marketing (Campaigns & Leads)
✅ Audit Logs

Plus:
- Row Level Security (RLS) for multi-tenant isolation
- Role-based permissions (5 roles)
- Proper indexes for performance
- Auto-sync for new users

## Common Issues

### "Copy button doesn't work"
- The script now has a fallback copy method
- If both fail, manually select and copy the text

### "Still showing errors after running SQL"
- Make sure the SQL completed successfully
- Check for any error messages in Supabase
- Try the "Refresh & Check Database" button

### "I don't see my Supabase project"
- Make sure you're logged into the correct Supabase account
- Check your Supabase project URL matches your app

## Need Help?

The error `PGRST205` simply means "table not found" - it's not a bug, it's just that you need to run the initial database setup. The app is designed to detect this and guide you through it!

---

**Your database setup screen is ready and waiting!** Just refresh your browser to see it.
