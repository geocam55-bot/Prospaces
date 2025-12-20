# 🔧 Fix npm Error in Codespaces

## ❌ The Error You're Seeing

```
npm error (Use `node --trace-uncaught ...` to show where the exception was thrown)
npm error
npm error Node.js v24.11.1
npm error A complete log of this run can be found in: /home/codespace/.npm/_logs/...
```

This happens because npm can't install globally in Codespaces with that method.

---

## ✅ SOLUTION: Use the Official Supabase CLI Installer

Instead of `npm install -g supabase`, we'll download the Supabase CLI directly!

---

## 🚀 NEW COMMANDS TO RUN

### Step 1: Download & Install Supabase CLI

Copy and paste **ALL 3 lines at once** (this is one command split across lines):

```bash
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | \
  tar -xz && \
  sudo mv supabase /usr/local/bin/
```

Press **Enter** and wait ~10 seconds.

### Step 2: Verify Installation

```bash
supabase --version
```

You should see:
```
1.x.x
```

**✅ If you see a version number, it worked!** Continue to Step 3!

---

### Step 3: Login to Supabase

```bash
supabase login
```

**What happens:**
1. Terminal shows a URL like: `https://api.supabase.com/v1/cli/authorize?token=...`
2. **Click the URL** (it's clickable!)
3. Browser tab opens → Click **"Authorize"**
4. Come back to Codespace tab
5. See: ✓ Logged in successfully

---

### Step 4: Set Nylas API Key

**IMPORTANT:** Replace `nyk_v0_YOUR_KEY_HERE` with your ACTUAL Nylas API key!

```bash
supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_KEY_HERE
```

**Don't have your Nylas API key yet?**
1. Go to: https://dashboard.nylas.com
2. Sign up / login
3. Create app: "ProSpaces CRM"
4. Copy the API key
5. Come back and run the command above

---

### Step 5: Link Supabase Project

```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

**You'll be asked:** `Enter your database password:`

**Don't know your password?**
1. Go to: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/settings/database
2. Scroll to "Database Password"
3. Click **"Reset Database Password"**
4. **Copy the new password**
5. Paste it in the terminal
6. Press **Enter**

**Note:** You won't see the password as you type (security feature!)

---

### Step 6: Deploy All Functions

**Copy this ENTIRE command** (it's all one line):

```bash
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

**This will take 2-5 minutes.** You'll see:
```
Deploying nylas-connect...
✓ Deployed nylas-connect (v1)

Deploying nylas-callback...
✓ Deployed nylas-callback (v1)

... (continues for all 7 functions)
```

**Wait for all 7 to finish!** Don't close the browser tab!

---

### Step 7: Verify All Deployed

```bash
supabase functions list
```

**You should see:**
```
┌──────────────────────┬──────────┬─────────┐
│ Name                 │ Status   │ Version │
├──────────────────────┼──────────┼─────────┤
│ nylas-connect        │ deployed │ v1      │
│ nylas-callback       │ deployed │ v1      │
│ nylas-send-email     │ deployed │ v1      │
│ nylas-sync-emails    │ deployed │ v1      │
│ nylas-webhook        │ deployed │ v1      │
│ nylas-sync-calendar  │ deployed │ v1      │
│ nylas-create-event   │ deployed │ v1      │
└──────────────────────┴──────────┴─────────┘
```

**All 7 functions = SUCCESS!** 🎉

---

## 📋 COMPLETE COMMAND LIST (Copy/Paste Order)

```bash
# 1. Install Supabase CLI (new method - all 3 lines at once!)
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | \
  tar -xz && \
  sudo mv supabase /usr/local/bin/

# 2. Verify installation
supabase --version

# 3. Login
supabase login
# (click the link, authorize, come back)

# 4. Set Nylas API key (replace with YOUR key!)
supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_KEY_HERE

# 5. Link project (enter password when asked)
supabase link --project-ref usorqldwroecyxucmtuw

# 6. Deploy all functions (wait 2-5 min)
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event

# 7. Verify
supabase functions list
```

---

## 🎯 What Changed?

### ❌ OLD (didn't work):
```bash
npm install -g supabase
```

### ✅ NEW (works!):
```bash
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | \
  tar -xz && \
  sudo mv supabase /usr/local/bin/
```

**Why?** This downloads the official Supabase CLI binary directly instead of using npm!

---

## 🆘 If You Still Get Errors

### Error: "curl: command not found"
**This shouldn't happen in Codespaces**, but if it does:
```bash
wget https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz
tar -xzf supabase_linux_amd64.tar.gz
sudo mv supabase /usr/local/bin/
```

### Error: "sudo: no password set"
Try without sudo:
```bash
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | \
  tar -xz && \
  mkdir -p ~/bin && \
  mv supabase ~/bin/
export PATH="$HOME/bin:$PATH"
```

### Error: "Permission denied"
The installation command needs sudo. If sudo doesn't work, use the alternative:
```bash
# Install to user directory instead
mkdir -p ~/.local/bin
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | \
  tar -xz -C ~/.local/bin/
export PATH="$HOME/.local/bin:$PATH"
```

Then verify:
```bash
supabase --version
```

---

## ✅ Success Checklist

After running all commands:

- [ ] `supabase --version` shows version number
- [ ] `supabase login` shows ✓ Logged in successfully
- [ ] `supabase secrets set` shows ✓ Finished
- [ ] `supabase link` shows ✓ Linked to project
- [ ] `supabase functions deploy` deploys all 7 functions
- [ ] `supabase functions list` shows 7 deployed functions

---

## 🎉 What's Next?

Once all 7 functions are deployed:

1. **Go to ProSpaces CRM:** https://pro-spaces.vercel.app/
2. **Login**
3. **Click "Email"** in sidebar
4. **Click "Add Email Account"**
5. **Select "Microsoft Outlook"**
6. **Click "Connect Microsoft Outlook"**

**Expected result:**
- ✅ No more "Unable to connect to email backend" error!
- ✅ Should redirect to Microsoft OAuth (after you set up Nylas - Part 3)

---

## 📖 Related Files

- `/FIX_BOTH_OAUTH_ISSUES.md` - Main OAuth setup guide
- `/DEPLOY_FUNCTIONS_WEB_STEP_BY_STEP.md` - Detailed deployment guide
- `/CODESPACES_VISUAL_GUIDE.md` - Visual walkthrough

---

**The npm error is fixed! Now use the curl command instead!** ✅
