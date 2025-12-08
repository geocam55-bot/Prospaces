# ✅ Password Reset Setup Checklist

## 🚀 BEFORE YOU START

- [ ] You have access to Supabase Dashboard
- [ ] You have database admin/owner permissions
- [ ] You're logged into your ProSpaces Supabase project

---

## 📝 SETUP STEPS

### Database Setup (Required - Do This First!)

- [ ] Open Supabase Dashboard (https://supabase.com/dashboard)
- [ ] Navigate to SQL Editor
- [ ] Open file `/ADD_PASSWORD_CHANGE_SUPPORT.sql` or `/QUICK_FIX.md`
- [ ] Copy the entire SQL script
- [ ] Paste into SQL Editor
- [ ] Click "Run" (or Ctrl/Cmd + Enter)
- [ ] Verify: See "Success" message
- [ ] Verify: Run `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'set_user_temporary_password';`
- [ ] Should return: `set_user_temporary_password`

---

## ✅ VERIFY IT'S WORKING

### Test Password Reset

- [ ] Go to ProSpaces CRM app
- [ ] Navigate to Users page
- [ ] Click "Reset Password" on any user
- [ ] Should see: "✅ Temporary password set! User can now log in."
- [ ] Dialog shows generated password
- [ ] Click purple "Copy" button
- [ ] Should see toast: "Password copied to clipboard!"

### Test User Login

- [ ] Open incognito/private browser window
- [ ] Go to ProSpaces CRM
- [ ] Enter user email and temporary password
- [ ] Click "Sign In"
- [ ] Should see: Password change dialog
- [ ] Dialog cannot be dismissed (as expected)
- [ ] Enter new password (must meet requirements)
- [ ] Confirm new password
- [ ] Click "Change Password"
- [ ] Should be logged in automatically

### Test After Password Change

- [ ] Log out
- [ ] Sign in with NEW password
- [ ] Should log in normally
- [ ] NO password change dialog should appear

---

## 🔍 TROUBLESHOOTING

If you see errors, check:

### Error: "Could not find the function"
- [ ] Did you run the SQL script?
- [ ] Check SQL Editor for errors
- [ ] Try running script again

### Error: "Permission denied"
- [ ] Are you database owner?
- [ ] Did the GRANT statements run?
- [ ] Try re-running just the GRANT lines

### Copy button doesn't work
- [ ] Check browser console (F12)
- [ ] Try in different browser
- [ ] Check if clipboard permissions blocked

### Password change dialog doesn't appear
- [ ] Check browser console for errors
- [ ] Verify `needs_password_change` column exists
- [ ] Manually check: `SELECT needs_password_change FROM profiles WHERE email = 'user@email.com';`

---

## 📚 REFERENCE DOCS

| File | Purpose |
|------|---------|
| `/QUICK_FIX.md` | Super quick 2-minute fix guide |
| `/SETUP_INSTRUCTIONS.md` | Detailed step-by-step setup |
| `/TEMP_PASSWORD_SETUP.md` | Complete documentation |
| `/ADD_PASSWORD_CHANGE_SUPPORT.sql` | Full SQL migration script |
| `/CHECKLIST.md` | This checklist |

---

## ✅ SUCCESS CRITERIA

You're done when:

✅ "Reset Password" button generates working password  
✅ Copy button copies password successfully  
✅ User can log in with temporary password  
✅ Password change dialog appears on first login  
✅ User cannot dismiss dialog without changing password  
✅ After changing password, user is logged in automatically  
✅ On subsequent logins, no password change required  

---

## 🎉 ALL DONE?

Congratulations! Your temporary password system is fully functional.

**Next Steps:**
- Test with a real user
- Consider adding email notifications (future enhancement)
- Review security settings

---

**Last Updated:** December 2024
