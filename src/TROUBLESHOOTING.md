# 🔧 Email Integration - Troubleshooting Guide

## 🚨 Common Deployment Issues

### Issue 1: "supabase: command not found"

**Cause:** Supabase CLI is not installed or not in PATH

**Solutions:**

```bash
# Install via npm (recommended)
npm install -g supabase

# Verify installation
supabase --version

# If still not found, restart your terminal
```

**Alternative installation methods:**
- macOS: `brew install supabase/tap/supabase`
- Windows: `scoop install supabase`

---

### Issue 2: "Not logged in" or "Authentication required"

**Cause:** Not authenticated with Supabase

**Solution:**

```bash
# Login to Supabase
supabase login

# This will open your browser
# Complete the authentication
# Return to terminal
```

**Verify:**
```bash
supabase projects list
```

Should show your projects without errors.

---

### Issue 3: "Project not linked" or "No linked project"

**Cause:** Your local project is not linked to Supabase

**Solution:**

```bash
# Link to your project
supabase link --project-ref usorqldwroecyxucmtuw

# Enter database password when prompted
# Get password from: Supabase Dashboard → Settings → Database
```

**Verify:**
```bash
# Check if config file exists
ls -la .supabase/config.toml
```

---

### Issue 4: "Failed to deploy function"

**Cause:** Various - check specific error message

**Solutions:**

**If "function not found":**
```bash
# Make sure you're in the correct directory
pwd
# Should show your project directory

# Check functions exist
ls -la supabase/functions/
```

**If "permission denied":**
```bash
# Check you have access to the project
supabase projects list
# Verify usorqldwroecyxucmtuw is listed
```

**If "build failed":**
```bash
# View detailed logs
supabase functions deploy nylas-connect --debug
```

---

### Issue 5: "Nylas API key not configured"

**Cause:** The NYLAS_API_KEY secret is not set

**Solution:**

```bash
# Set the secret
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv

# Verify it's set
supabase secrets list
# Should show NYLAS_API_KEY in the list

# Redeploy functions to pick up the new secret
supabase functions deploy nylas-connect
```

---

### Issue 6: "Function deployed but diagnostic test fails"

**Cause:** Function deployed but not working correctly

**Solutions:**

**Check function logs:**
```bash
# View real-time logs
supabase functions logs nylas-connect --tail

# In another terminal/tab, run the diagnostic test
# Watch for errors in the logs
```

**Check function status:**
```bash
supabase functions list
```

Should show all functions as ACTIVE.

**Redeploy the function:**
```bash
supabase functions deploy nylas-connect
```

---

## 🌐 Common OAuth Issues

### Issue 7: "Failed to fetch" in browser

**Cause:** Function not deployed or not accessible

**Solutions:**

1. **Verify deployment:**
   ```bash
   supabase functions list
   ```

2. **Check browser console (F12)** for detailed error

3. **Use IMAP/SMTP instead** (works without deployment):
   - Go to Email → Add Account → IMAP/SMTP tab

---

### Issue 8: "OAuth popup blocked"

**Cause:** Browser blocking popup windows

**Solution:**

1. Look for popup blocker icon in address bar
2. Click and select "Always allow popups from this site"
3. Try connecting again

---

### Issue 9: "OAuth callback failed"

**Cause:** Redirect URI mismatch in Nylas

**Solution:**

1. Go to Nylas Dashboard → Your App → Settings
2. Add callback URL:
   ```
   https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback
   ```
3. Save and try connecting again

---

### Issue 10: "Invalid grant" or "Token expired"

**Cause:** OAuth token issues

**Solution:**

1. Remove the email account from CRM
2. Try connecting again with fresh OAuth flow
3. If persists, check Nylas API key is correct:
   ```bash
   supabase secrets list
   ```

---

## 📧 Email Connection Issues

### Issue 11: "IMAP connection failed"

**Cause:** Invalid IMAP credentials or settings

**Solutions:**

**For Gmail:**
1. Use App Password, not regular password
2. Create at: https://myaccount.google.com/apppasswords
3. Settings: `imap.gmail.com:993`

**For Outlook:**
1. Settings: `outlook.office365.com:993`
2. Enable IMAP in Outlook settings
3. May need app password if 2FA enabled

**For Yahoo:**
1. Settings: `imap.mail.yahoo.com:993`
2. Generate app password in Yahoo settings
3. Enable "Allow apps that use less secure sign in"

---

### Issue 12: "Cannot send email"

**Cause:** SMTP settings or OAuth scope issues

**Solutions:**

**For IMAP/SMTP:**
- Verify SMTP settings match IMAP
- Gmail SMTP: `smtp.gmail.com:465` or `smtp.gmail.com:587`
- Use same app password as IMAP

**For OAuth:**
- Check Nylas has send permission
- Verify OAuth scopes include email.send
- Try reconnecting the account

---

### Issue 13: "Email sync not working"

**Cause:** Various sync issues

**Solutions:**

1. **Check account connection:**
   - Account should show "Connected" status
   - Last sync time should update

2. **Manual sync:**
   - Click "Sync" button in Email module
   - Watch for errors

3. **Check logs:**
   ```bash
   supabase functions logs nylas-sync-emails --tail
   ```

4. **Reconnect account:**
   - Remove and re-add the email account

---

## 🔍 Debugging Tips

### View Function Logs in Real-Time

```bash
# Watch all functions
supabase functions logs --tail

# Watch specific function
supabase functions logs nylas-connect --tail

# With more details
supabase functions logs nylas-connect --tail --debug
```

### Check Browser Console

1. Press `F12` to open Developer Tools
2. Go to Console tab
3. Look for red error messages
4. Copy error and search in this guide

### Check Network Tab

1. Press `F12`
2. Go to Network tab
3. Try connecting email
4. Look for failed requests (red)
5. Click on failed request → Response tab
6. Read error message

### Test Individual Functions

```bash
# Test nylas-connect is accessible
curl https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-connect

# Should return CORS error (that's OK, means function exists)
```

---

## 🆘 Still Stuck?

### Fallback Option: Use IMAP/SMTP

If OAuth isn't working, you can always use IMAP/SMTP:

1. Go to Email module
2. Click "Add Account"
3. Select "IMAP/SMTP" tab
4. Enter your email settings
5. Works without any deployment!

### Reset Everything

If all else fails, start fresh:

```bash
# 1. Unlink project
rm -rf .supabase

# 2. Re-link
supabase link --project-ref usorqldwroecyxucmtuw

# 3. Set secret again
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv

# 4. Deploy functions again
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
```

---

## 📊 Diagnostic Commands Quick Reference

```bash
# Check CLI version
supabase --version

# Check login status
supabase projects list

# Check linked project
cat .supabase/config.toml

# Check secrets
supabase secrets list

# Check deployed functions
supabase functions list

# View logs
supabase functions logs nylas-connect --tail

# Test function deployment
curl https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-connect
```

---

## 📞 Getting More Help

1. **Function Logs:** Most issues show up in logs
   ```bash
   supabase functions logs nylas-connect --tail
   ```

2. **Browser Console:** Press F12, check Console tab

3. **Documentation:**
   - `DEPLOY_COMMANDS.md` - Deployment steps
   - `ACTIVATE_LIVE_EMAIL.md` - Full setup guide
   - `README_EMAIL_SETUP.md` - Overview

4. **Supabase Documentation:**
   - https://supabase.com/docs/guides/cli
   - https://supabase.com/docs/guides/functions

---

**Most Common Fix:** 90% of issues are solved by:
1. Making sure you're in the project directory
2. Being logged in: `supabase login`
3. Having project linked: `supabase link --project-ref usorqldwroecyxucmtuw`
4. Having API key set: `supabase secrets set NYLAS_API_KEY=...`
5. Actually deploying: `supabase functions deploy nylas-connect`
