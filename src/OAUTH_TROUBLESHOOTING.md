# 🔧 OAuth Deployment Troubleshooting

Quick solutions to common problems during deployment.

---

## 🔴 Problem: Can't Find GitHub Repository

### Symptoms:
- Don't know where your code is
- Can't find the repo URL

### Solution:
1. Go to https://github.com/YOUR_USERNAME?tab=repositories
2. Look for a repo with "ProSpaces" or "CRM" in the name
3. If you don't see it, check if you exported from Figma Make correctly

### Alternative:
If you never pushed to GitHub:
1. In Figma Make, click **Export** → **Download**
2. Create new GitHub repo
3. Upload files to GitHub
4. Then follow deployment steps

---

## 🔴 Problem: "Command not found: supabase"

### Symptoms:
```
bash: supabase: command not found
```

### Solution:
```bash
# Try installing again
npm install -g supabase

# Wait for it to finish completely
# Then verify:
supabase --version
```

### If still not working:
```bash
# Check if npm is installed
npm --version

# If npm not found, install Node.js first:
# In Codespace, it should be pre-installed
# Try closing and reopening terminal
```

---

## 🔴 Problem: "Failed to login"

### Symptoms:
- `supabase login` doesn't work
- Browser window doesn't open
- Can't authorize

### Solution 1 - Manual URL:
```bash
supabase login
```
Copy the URL shown, paste into new browser tab manually, click Authorize

### Solution 2 - Check Browser Popups:
- Your browser might be blocking popups
- Allow popups for codespaces.github.com
- Try again

---

## 🔴 Problem: "Failed to link project"

### Symptoms:
```
Error: Invalid database password
```
or
```
Error: Project not found
```

### Solution 1 - Reset Database Password:
1. Go to: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/settings/database
2. Scroll to "Database Password"
3. Click **"Reset Database Password"**
4. Copy the new password
5. Try `supabase link` again with new password

### Solution 2 - Check Project Reference:
Make sure you're using the correct project ref:
```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

---

## 🔴 Problem: "NYLAS_API_KEY secret failed"

### Symptoms:
- Secret won't set
- Error when setting secret

### Solution:
```bash
# Make sure project is linked first
supabase link --project-ref usorqldwroecyxucmtuw

# Then set secret (no spaces, no quotes around key)
supabase secrets set NYLAS_API_KEY=nyk_v0_your_key_here
```

### Verify Secret Was Set:
```bash
supabase secrets list
```
Should show: `NYLAS_API_KEY`

---

## 🔴 Problem: Function Deployment Fails

### Symptoms:
```
Error: Function deployment failed
```
or
```
Error: Cannot find function
```

### Solution 1 - Check Directory:
```bash
# Verify you're in the right place
pwd

# Should show something like:
# /workspaces/YOUR_REPO_NAME

# If not, navigate to project root:
cd /workspaces/YOUR_REPO_NAME
```

### Solution 2 - Check Files Exist:
```bash
ls supabase/functions/

# Should show:
# nylas-connect/
# nylas-callback/
# nylas-send-email/
# ...etc
```

### Solution 3 - Deploy One at a Time:
Instead of all at once, deploy individually:
```bash
supabase functions deploy nylas-connect
# Wait for success, then:
supabase functions deploy nylas-callback
# And so on...
```

---

## 🔴 Problem: OAuth Redirects to Error Page

### Symptoms:
- Click "Connect Gmail" or "Connect Outlook"
- Goes to Nylas page
- Shows error: "Invalid redirect URI"

### Solution:
1. Go to Nylas Dashboard: https://dashboard.nylas.com
2. Click your app → **"Settings"**
3. Find **"Redirect URIs"**
4. Make sure this EXACT URL is added:
   ```
   https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback
   ```
5. Click **"Save"**
6. Try OAuth again

---

## 🔴 Problem: "NYLAS_API_KEY not found" in Logs

### Symptoms:
- OAuth flow starts
- Edge Function logs show: "NYLAS_API_KEY is not set"

### Solution:
```bash
# Re-link project
supabase link --project-ref usorqldwroecyxucmtuw

# Set secret again
supabase secrets set NYLAS_API_KEY=your_actual_key_here

# Wait 30 seconds for secret to propagate

# Test by checking logs:
supabase functions logs nylas-connect --tail
```

---

## 🔴 Problem: Google/Microsoft Integration Not Working

### Symptoms:
- OAuth flow shows error from Google or Microsoft
- "App not configured" or "Invalid client"

### Solution:
1. Go to Nylas Dashboard: https://dashboard.nylas.com
2. Click **"Integrations"**
3. For **Google**:
   - Click "Connect"
   - Follow setup wizard
   - Make sure OAuth consent screen is configured
   - Add test users if in development mode
4. For **Microsoft**:
   - Click "Connect"
   - Follow setup wizard
   - Make sure app has correct permissions

---

## 🔴 Problem: SQL Migration Shows Errors

### Symptoms:
```
ERROR: policy "X" already exists
```
or
```
ERROR: table "Y" already exists
```

### Solution:
**This is actually FINE!** The migration is idempotent (safe to run multiple times).

The migration will:
1. Create tables if they don't exist (IF NOT EXISTS)
2. Drop existing policies
3. Create new policies

### Verify Success:
Check the end of the SQL output. You should see:
- List of tables (email_accounts, email_messages, etc.)
- List of policies (13 policies)

If you see those, the migration worked! ✅

---

## 🔴 Problem: Codespace Won't Load

### Symptoms:
- Stuck on "Setting up your codespace..."
- Never finishes loading

### Solution 1 - Wait:
- First load can take 2-5 minutes
- Be patient!

### Solution 2 - Refresh:
- Refresh the browser page
- Try again

### Solution 3 - Delete & Recreate:
1. Go to https://github.com/codespaces
2. Find your codespace
3. Click "..." → "Delete"
4. Go back to your repo
5. Create new codespace

---

## 🔴 Problem: Functions Deploy But Don't Work

### Symptoms:
- `supabase functions list` shows all functions
- OAuth still gives error in ProSpaces

### Solution 1 - Check Function URLs:
Test the endpoint directly:
```bash
curl https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-connect
```

Should respond (even with error, proves it exists).

### Solution 2 - Check Logs:
```bash
supabase functions logs nylas-connect --tail
```
Leave this running, then try OAuth in ProSpaces. Watch for errors.

### Solution 3 - Verify Supabase URL:
In ProSpaces CRM code, check `/utils/supabase/client.ts`:
- Should have: `https://usorqldwroecyxucmtuw.supabase.co`
- If different, update and redeploy

---

## 🔴 Problem: "Database password required"

### Symptoms:
When linking project, asks for password but you don't know it.

### Solution:
1. Go to Supabase Dashboard
2. Project Settings → Database
3. Scroll to "Database Password"
4. Click "Reset Database Password"
5. Copy the new password (save it somewhere!)
6. Use this password when linking

**Note:** Resetting password won't break anything - it's just for CLI access.

---

## 🔴 Problem: After Deployment, Still See Old Error

### Symptoms:
- Functions deployed successfully
- ProSpaces still shows: "Unable to connect to email backend"

### Solution 1 - Hard Refresh:
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### Solution 2 - Clear Cache:
1. Open browser DevTools (F12)
2. Right-click the Refresh button
3. Click "Empty Cache and Hard Reload"

### Solution 3 - Check Function URL:
Look at browser Network tab (F12 → Network):
- Should see request to: `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-connect`
- Check the response - does it show a real error or 404?

---

## 🔴 Problem: Nylas API Key Invalid

### Symptoms:
- Functions deploy
- Logs show: "Invalid API key"

### Solution:
1. Go to Nylas Dashboard: https://dashboard.nylas.com
2. Check your API key - copy it again
3. Make sure you're using the **API Key** (not Client ID or Secret)
4. It should start with `nyk_v0_`
5. Set secret again:
   ```bash
   supabase secrets set NYLAS_API_KEY=nyk_v0_correct_key_here
   ```

---

## 🔴 Problem: Can't Access Supabase Dashboard

### Symptoms:
- Can't login to Supabase
- Project won't load

### Solution:
- Check you're logged in with the correct account
- Try: https://supabase.com/dashboard/projects
- Make sure project wasn't paused (free tier auto-pauses after inactivity)

---

## 📊 Diagnostic Commands

Use these to check status:

```bash
# Check CLI version
supabase --version

# Check if logged in
supabase projects list

# Check which project is linked
cat .git/config | grep supabase

# List all functions
supabase functions list

# Check secrets (won't show values, just names)
supabase secrets list

# Tail logs for a function
supabase functions logs nylas-connect --tail

# Check local directory
pwd
ls -la supabase/functions/
```

---

## 🆘 Still Stuck?

If none of these solutions work:

### Share This Info:
1. Which step you're on (e.g., "Step 3b - Install & Login")
2. The exact error message (copy/paste)
3. Output of diagnostic commands above
4. Screenshot if possible

### Common Copy/Paste for Help:
```
I'm stuck at: [STEP NAME]

Error message:
[PASTE ERROR HERE]

What I tried:
- [LIST WHAT YOU TRIED]

Diagnostic output:
[PASTE RESULTS OF DIAGNOSTIC COMMANDS]
```

---

## ✅ Success Indicators

You know it's working when:
- [ ] `supabase functions list` shows all 7 functions
- [ ] Click "Connect Gmail" doesn't show error
- [ ] Redirects to Nylas/Google OAuth page
- [ ] After OAuth, returns to ProSpaces
- [ ] Shows "Email account connected successfully!"

---

## 🎯 Prevention Checklist

To avoid issues:
- [ ] Run SQL migration FIRST (before deploying functions)
- [ ] Copy Nylas API key correctly (no extra spaces)
- [ ] Use exact project ref: `usorqldwroecyxucmtuw`
- [ ] Use exact redirect URI in Nylas Dashboard
- [ ] Enable Google & Microsoft integrations in Nylas
- [ ] Wait for functions to fully deploy before testing
- [ ] Hard refresh ProSpaces after deploying

---

**Remember:** Most issues are simple configuration mismatches. Double-check URLs, keys, and spelling! 🔍
