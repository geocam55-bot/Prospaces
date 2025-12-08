# 📋 Exact Copy/Paste Guide for GitHub Web (PRODUCTION ONLY)

## 🎯 Purpose
This guide shows EXACTLY what to copy from Figma Make and where to paste in GitHub.

**⚠️ PRODUCTION MODE:** No mock files - only real OAuth integration.

---

## 📁 FILE-BY-FILE INSTRUCTIONS

### **FILE 1: `/utils/api.ts`**

**Action:** EDIT EXISTING FILE

**⚠️ BACKUP FIRST!**
1. Open file in GitHub
2. Copy entire content to Notepad (backup)
3. Now proceed with edit:

**GitHub Steps:**
1. Navigate to `/utils/api.ts`
2. Click pencil icon (Edit)
3. Scroll to the END of the file
4. Find the last `}` closing brace
5. BEFORE the last `}`, add this:

```typescript
// =============================================
// EMAIL API
// =============================================
export const emailsAPI = {
  getAccounts: async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    return { accounts: data || [] };
  },

  deleteAccount: async (accountId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', accountId);

    if (error) throw error;
    return { success: true };
  },
};
```

6. Commit message: "Add email API endpoints"
7. Click "Commit changes"

**⚠️ If it breaks:** Revert using your backup from step 2!

---

### **FILE 2: `/components/Emails.tsx`**

**Action:** CREATE NEW FILE

**GitHub Steps:**
1. Navigate to `/components/` folder
2. Click "Add file" → "Create new file"
3. Name it: `Emails.tsx`
4. Copy ENTIRE content from Figma Make `/components/Emails.tsx`
5. Paste into GitHub editor
6. Commit message: "Add Emails component (production)"
7. Click "Commit new file"

---

### **FILE 3: `/components/CalendarAccountSetup.tsx`**

**Action:** CREATE NEW FILE (or OVERWRITE if exists)

**GitHub Steps:**
1. Navigate to `/components/` folder
2. If file exists: Click on it, then pencil icon to edit
3. If new: Click "Add file" → "Create new file"
4. Name it: `CalendarAccountSetup.tsx`
5. Copy ENTIRE content from Figma Make `/components/CalendarAccountSetup.tsx`
6. Paste into GitHub editor
7. Commit message: "Add/update Calendar setup (production only)"
8. Click "Commit new file" or "Commit changes"

---

### **FILE 4: `/components/Appointments.tsx`**

**Action:** EDIT EXISTING FILE

**⚠️ BACKUP FIRST!**
1. Open file in GitHub
2. Copy entire content to Notepad (backup)

**GitHub Steps:**
1. Navigate to `/components/Appointments.tsx`
2. Click pencil icon (Edit)
3. SELECT ALL (Ctrl+A / Cmd+A)
4. DELETE all content
5. Copy ENTIRE content from Figma Make `/components/Appointments.tsx`
6. Paste into GitHub editor
7. Commit message: "Update Appointments with production calendar sync"
8. Click "Commit changes"

---

### **FILE 5: `/App.tsx`**

**Action:** EDIT EXISTING FILE

**⚠️ BACKUP FIRST!**
1. Open file in GitHub
2. Copy entire content to Notepad (backup)

**Find and add imports (top of file):**

```typescript
import { Emails } from './components/Emails';
import { Mail } from 'lucide-react';
```

**Find the navigationItems array and add:**

```typescript
{ name: 'Emails', icon: Mail, path: 'emails' },
```

**Find where routes are defined and add:**

```typescript
{activeTab === 'emails' && <Emails user={user} />}
```

**GitHub Steps:**
1. Navigate to `/App.tsx`
2. Click pencil icon (Edit)
3. Make the changes above
4. Commit message: "Add Emails route to App"
5. Click "Commit changes"

---

## ❌ FILES TO SKIP (NOT NEEDED)

**DO NOT CREATE OR DEPLOY:**

```
❌ /utils/emailSyncMock.ts         [Mock - not needed for production]
❌ /utils/calendarSyncMock.ts      [Mock - not needed for production]
```

These files exist in Figma Make for demo purposes but are **NOT required** for production deployment.

---

## ✅ VERIFICATION

After copying all files, verify in GitHub:

```
✅ /utils/api.ts                      [Updated with emailsAPI]
✅ /components/Emails.tsx              [New file]
✅ /components/CalendarAccountSetup.tsx [New or updated]
✅ /components/Appointments.tsx        [Updated]
✅ /App.tsx                            [Updated with Emails route]
```

---

## 🚨 IMPORTANT NOTES

### **CSS Files - DO NOT TOUCH:**

**⚠️ NEVER EDIT THESE:**
```
❌ /styles/globals.css        [DO NOT MODIFY]
❌ /tailwind.config.cjs       [DO NOT MODIFY]
❌ /postcss.config.cjs        [DO NOT MODIFY]
```

**Why?** These are already deployed and working. Changing them can break your entire design.

---

### **Next Steps After Copying Files:**

1. **Set up OAuth credentials** (Google + Microsoft)
2. **Deploy Edge Functions** to Supabase
3. **Configure Supabase secrets**
4. **Create database tables**
5. **Test OAuth flows**

**See:** `PRODUCTION_ONLY_DEPLOYMENT.md` for complete setup.

---

## 🎯 SUMMARY

**Total Files to Copy: 5**
- 1 file to update with addition (`/utils/api.ts`)
- 1 new file (`/components/Emails.tsx`)
- 1 new/updated file (`/components/CalendarAccountSetup.tsx`)
- 2 files to update completely (`/components/Appointments.tsx`, `/App.tsx`)

**Mock files: 0** (not needed)

**Time: ~15 minutes** (careful copy/paste)

---

## ⚠️ TROUBLESHOOTING

### **"Import not found" errors:**
- Ensure exact file names match (case-sensitive)
- Check imports at top of files

### **"Component not defined" errors:**
- Verify you added imports to `/App.tsx`
- Check export statements in component files

### **"OAuth not working":**
- This is expected until Edge Functions deployed
- See `PRODUCTION_ONLY_DEPLOYMENT.md`

---

**Status:** Production-Only Copy Guide
**Mock Files:** Not included
**OAuth Required:** Yes (after deployment)
**Time:** 15 minutes for file copy
