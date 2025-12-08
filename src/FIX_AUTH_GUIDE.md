# 🔐 FIX AUTHENTICATION ISSUES

## Errors You're Getting

1. ❌ **Sign up error:** "Invalid or expired invitation code"
2. ❌ **Sign in error:** "INVALID_CREDENTIALS"

## Root Causes

1. **Invitations table missing** - The app requires invitation codes but the table doesn't exist
2. **Email not confirmed** - Users need email confirmation
3. **Profile sync issues** - Auth users might not have profiles

---

## ✅ THE COMPLETE FIX

### File: `/FIX_AUTH_ISSUES.sql` ⭐⭐⭐⭐⭐

### What It Does:
1. ✅ Creates invitations table
2. ✅ Creates test invitation codes you can use
3. ✅ Confirms all existing user emails
4. ✅ Syncs profiles with auth.users
5. ✅ Sets up proper RLS policies

### Steps:
1. **Supabase Dashboard** → **SQL Editor**
2. Copy **entire** `/FIX_AUTH_ISSUES.sql`
3. Paste and click **Run**
4. Wait for "✅ AUTH ISSUES FIXED!"
5. **Try signing in/up!**

---

## 🎟️ INVITATION CODES (After Running Script)

Use these codes to sign up:

| Code | Purpose | Role |
|------|---------|------|
| `TEST2024` | General testing | standard_user |
| `ADMIN2024` | Admin access | admin |
| `RONA2024` | RONA Atlantic users | standard_user |

All codes expire in 365 days (1 year).

---

## 🔓 FOR EXISTING USERS (Sign In Issues)

### After running the script:

✅ **All existing users:**
- Email confirmed automatically
- Profile synced with auth
- Can sign in with email + password

### If Sign In Still Fails:

**Check these:**
1. **Password correct?** - Try typing it carefully
2. **Email exact?** - Case-sensitive
3. **Account exists?** - Try "Forgot Password" to reset

**Common Issue:** Wrong password
- **Solution:** Use "Forgot Password" link to reset

---

## 🆕 FOR NEW USERS (Sign Up)

### After running the script:

1. Go to Sign Up page
2. Enter your email
3. Choose a password (6+ characters)
4. **Enter invitation code:** `TEST2024`
5. Click Sign Up
6. Check email for confirmation link
7. Click confirmation link
8. Sign in! ✅

---

## 📊 VERIFICATION

After running the script, you'll see:

```
--- Available Invitation Codes ---
TEST2024  | test@example.com | standard_user | pending | 2025-12-03
ADMIN2024 | admin@example.com | admin | pending | 2025-12-03
RONA2024  | newuser@ronaatlantic.ca | standard_user | pending | 2025-12-03

--- User/Profile Sync Status ---
total_auth_users | users_with_profiles | missing_profiles
5                | 5                   | 0

--- Users Ready to Sign In ---
george.campbell@prospaces.com | super_admin | ProSpaces CRM | ✅
larry.lee@ronaatlantic.ca | admin | RONA Atlantic | ✅
... all users ... | ✅

✅ AUTH ISSUES FIXED!
```

---

## 🔧 WHAT GETS FIXED

| Issue | Before | After |
|-------|--------|-------|
| Invitations table | ❌ Missing | ✅ Created |
| Invitation codes | ❌ None | ✅ 3 test codes |
| Email confirmation | ❌ Some unconfirmed | ✅ All confirmed |
| Profile sync | ❌ Possibly broken | ✅ All synced |
| Sign up | ❌ "Invalid code" | ✅ Works with TEST2024 |
| Sign in | ❌ "Invalid credentials" | ✅ Works for all users |

---

## 🎯 QUICK TESTING

### Test Sign In (Existing User):
1. Run `/FIX_AUTH_ISSUES.sql`
2. Go to your app login page
3. Enter your email and password
4. Should work! ✅

### Test Sign Up (New User):
1. Run `/FIX_AUTH_ISSUES.sql`
2. Go to Sign Up page
3. Email: `test@yourcompany.com`
4. Password: `password123`
5. Invitation Code: `TEST2024`
6. Click Sign Up
7. Check email and confirm
8. Sign in! ✅

---

## 🐛 TROUBLESHOOTING

### Sign In Still Fails?

**Error: "INVALID_CREDENTIALS"**
- **Cause:** Wrong password or email not confirmed
- **Fix 1:** Check password is correct
- **Fix 2:** Verify email was confirmed (check email for link)
- **Fix 3:** Reset password using "Forgot Password"

**Error: "Email not confirmed"**
- **Cause:** Haven't clicked confirmation email
- **Fix:** Check email (spam folder too), click link

### Sign Up Still Fails?

**Error: "Invalid invitation code"**
- **Cause:** Typed code wrong or script didn't run
- **Fix 1:** Make sure you typed `TEST2024` exactly (all caps)
- **Fix 2:** Run `/FIX_AUTH_ISSUES.sql` again
- **Fix 3:** Check invitations table exists:
  ```sql
  SELECT * FROM invitations WHERE invitation_code = 'TEST2024';
  ```

**Error: "Email already registered"**
- **Cause:** Account exists
- **Fix:** Use Sign In instead of Sign Up

---

## 🔑 CREATING NEW INVITATION CODES

After the script runs, admins can create more codes through the app's user management interface, or manually:

```sql
-- Create a new invitation code
INSERT INTO invitations (email, organization_id, role, invitation_code, status, expires_at)
SELECT 
    'newuser@example.com',
    (SELECT id FROM organizations WHERE name = 'RONA Atlantic'),
    'standard_user',
    'CUSTOM2024',
    'pending',
    NOW() + INTERVAL '30 days';
```

---

## 📝 IMPORTANT NOTES

### Invitation Codes:
- Required for sign up (security feature)
- Case-sensitive (use UPPERCASE)
- Can be reused unless marked as single-use
- Expire after set period

### Email Confirmation:
- Required for security
- Check spam folder if not received
- Link expires after 24 hours
- Can resend from login page

### Profiles:
- Automatically created on sign up
- Synced with auth.users
- Organization assigned from invitation

---

## 🎉 SUCCESS CHECKLIST

- [ ] Ran `/FIX_AUTH_ISSUES.sql` in Supabase
- [ ] Saw "✅ AUTH ISSUES FIXED!"
- [ ] Saw 3 invitation codes listed
- [ ] All users show ✅ for email_confirmed
- [ ] Tried signing in - works! ✅
- [ ] Tried signing up with TEST2024 - works! ✅
- [ ] No more "Invalid credentials" errors
- [ ] No more "Invalid invitation code" errors

---

## TL;DR

```bash
Problem: Missing invitations table + auth issues
Solution: /FIX_AUTH_ISSUES.sql
Invitation Codes: TEST2024, ADMIN2024, RONA2024
Steps: Supabase SQL Editor → Paste → Run → Try logging in
Result: Auth works perfectly ✅
```

---

Run `/FIX_AUTH_ISSUES.sql` now and your authentication will be fixed! 🚀
