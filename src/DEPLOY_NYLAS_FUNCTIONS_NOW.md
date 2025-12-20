# 🚀 Deploy Nylas Edge Functions - Step by Step

## ❌ THE PROBLEM:

You don't see the 7 Nylas functions in Supabase Dashboard!

This means they **haven't been deployed yet** - that's why you're getting:
```
⚠️ Unable to connect to email backend. The Edge Functions may not be deployed yet.
```

---

## ✅ LET'S FIX THIS NOW!

We need to:
1. ✅ Check if the function files exist in your code
2. ✅ Deploy them to Supabase
3. ✅ Verify they appear in Supabase Dashboard

---

## 🔍 STEP 1: Check If Functions Exist in Your Code

### **Option A: Using Codespaces**

If you still have Codespaces open:

1. Look at the **left sidebar** (Explorer panel)
2. Find the **`supabase`** folder
3. Expand it → Look for **`functions`** folder
4. Expand `functions` → You should see 7 folders:
   ```
   📁 supabase/
     📁 functions/
       📁 nylas-connect/
       📁 nylas-callback/
       📁 nylas-send-email/
       📁 nylas-sync-emails/
       📁 nylas-webhook/
       📁 nylas-sync-calendar/
       📁 nylas-create-event/
   ```

**Do you see these 7 folders?**
- ✅ **YES** → Great! Skip to Step 2 (Deploy them!)
- ❌ **NO** → The function files might not be in your repo - see "Option B" below

---

### **Option B: Using GitHub Web**

If you don't have Codespaces open or don't see the functions:

1. Go to your GitHub repository in browser
2. Click through: **`supabase`** → **`functions`**
3. You should see 7 folders listed

**Don't see the `supabase/functions` folder at all?**
- The Nylas functions might not be in your GitHub repo
- We'll need to create them (see bottom of this guide)

---

## 🚀 STEP 2: Deploy the Functions

### **Method 1: Using Codespaces** (Recommended)

If you still have Codespaces open from earlier:

#### **2.1 - Make Sure You're Logged In**

In the terminal, check if you're logged in:
```bash
supabase --version
```

Should show version like `1.x.x` ✅

If not installed, run:
```bash
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | \
  tar -xz && \
  sudo mv supabase /usr/local/bin/
```

#### **2.2 - Login (if needed)**

```bash
supabase login
```

#### **2.3 - Set API Key (if not done yet)**

**IMPORTANT:** Replace with your ACTUAL Nylas API key!

```bash
supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_ACTUAL_KEY_HERE
```

**Don't have your Nylas API key?**
1. Go to https://dashboard.nylas.com
2. Login or sign up
3. Create app: "ProSpaces CRM"
4. Copy the API key

#### **2.4 - Link Project (if not done yet)**

```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

Enter your database password when asked.

#### **2.5 - Check Current Directory**

Make sure you're in the right place:
```bash
pwd
```

Should show something like:
```
/workspaces/prospaces-crm
```

Or:
```
/workspaces/YOUR_REPO_NAME
```

**If it doesn't show a path with your repo name:**
```bash
cd /workspaces/YOUR_REPO_NAME
```

#### **2.6 - Deploy All Functions!** 🚀

**Copy this ENTIRE command** (all one line):

```bash
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

**This will take 2-5 minutes!** ⏳

**What you should see:**
```
Deploying nylas-connect...
Bundling nylas-connect...
✓ Deployed nylas-connect (v1)

Deploying nylas-callback...
Bundling nylas-callback...
✓ Deployed nylas-callback (v1)

Deploying nylas-send-email...
Bundling nylas-send-email...
✓ Deployed nylas-send-email (v1)

... (continues for all 7)
```

**Wait for ALL 7 to finish!** Don't close the browser!

---

### **Method 2: Open New Codespace** (If you closed it)

If you closed Codespaces earlier:

1. Go to your GitHub repo
2. Click green **"<> Code"** button
3. Click **"Codespaces"** tab
4. Click **"Create codespace on main"** (or open existing one)
5. Wait for it to load (1-2 min)
6. Follow Method 1 steps above (2.1 - 2.6)

---

## ✅ STEP 3: Verify Deployment

### **3.1 - Check in Codespaces Terminal**

Run:
```bash
supabase functions list
```

**Expected output:**
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

**See all 7?** 🎉 **SUCCESS! Continue to 3.2!**

**Don't see 7 functions?** Check for errors in the terminal output.

---

### **3.2 - Check in Supabase Dashboard**

1. Go to: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/functions
2. **Refresh the page** (Ctrl+R or Cmd+R)
3. You should now see **7 functions** listed!

**See all 7?** ✅ **PERFECT!**

---

## 🆘 TROUBLESHOOTING

### **Error: "function not found" or "No such file or directory"**

**Cause:** The function files don't exist in your repo

**Fix:** The Nylas functions might not be in your GitHub repo. You need to check if the `supabase/functions` folder has the Nylas function files.

**In Codespaces terminal, run:**
```bash
ls -la supabase/functions/
```

**What you should see:**
```
nylas-connect/
nylas-callback/
nylas-send-email/
nylas-sync-emails/
nylas-webhook/
nylas-sync-calendar/
nylas-create-event/
```

**Don't see these folders?** Tell me and I'll help you create them!

---

### **Error: "NYLAS_API_KEY secret not found"**

**Cause:** API key not set

**Fix:**
```bash
supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_ACTUAL_KEY
```

---

### **Error: "not logged in" or "access denied"**

**Cause:** Not logged into Supabase CLI

**Fix:**
```bash
supabase login
```

---

### **Error: "project not linked"**

**Cause:** Project not linked

**Fix:**
```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

---

## 📋 COMPLETE DEPLOYMENT CHECKLIST

Run these commands in order (in Codespaces terminal):

```bash
# 1. Check you're in the right directory
pwd
# Should show: /workspaces/YOUR_REPO_NAME

# 2. Check if functions exist
ls -la supabase/functions/
# Should show 7 folders

# 3. Make sure CLI is installed
supabase --version

# 4. Login
supabase login

# 5. Set API key (replace with YOUR key!)
supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_KEY

# 6. Link project
supabase link --project-ref usorqldwroecyxucmtuw

# 7. Deploy all 7 functions (wait 2-5 min)
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event

# 8. Verify
supabase functions list

# 9. Check Supabase Dashboard
# Go to: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/functions
```

---

## 🎯 AFTER DEPLOYMENT SUCCESS:

Once you see all 7 functions in Supabase Dashboard:

1. ✅ **First error fixed!** "Unable to connect to email backend" → GONE!
2. ⏳ **But you still need to configure Nylas OAuth** to fix the second error!

**Next steps:**
1. Configure Microsoft OAuth in Nylas Dashboard
2. Set redirect URI
3. Test!

**Full guide:** `/CONFIGURE_NYLAS_OAUTH_NOW.md`

---

## 🔍 WHAT IF FUNCTIONS DON'T EXIST IN YOUR REPO?

If you run `ls -la supabase/functions/` and don't see the 7 Nylas folders:

**Tell me and I'll help you!** I can:
1. Check if the functions exist in your codebase
2. Create the function files if they're missing
3. Help you commit them to GitHub

**Just say:** "The functions don't exist in my repo" and I'll create them for you!

---

## 🎉 SUCCESS CRITERIA:

✅ Run `supabase functions list` → See 7 functions  
✅ Supabase Dashboard → Functions page → See 7 functions  
✅ Each function shows "deployed" status  

**Then the backend error is fixed!** 🚀

---

**Go to Codespaces now and deploy those functions!** 💪

**Need help? Run `ls -la supabase/functions/` and tell me what you see!**
