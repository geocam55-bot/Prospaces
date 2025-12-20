# ✅ What's Next After Supabase Login

## 🎉 You Just Completed:
- ✅ Installed Supabase CLI
- ✅ Logged in to Supabase

---

## 🚀 NEXT STEPS (3 More Commands!)

### **WAIT!** Do You Have Your Nylas API Key Yet? 🔑

Before running the next commands, you need a **Nylas API Key**.

**Do you have it?** (It looks like `nyk_v0_abc123...`)

---

## 🔀 Choose Your Path:

### **Path A: I Already Have My Nylas API Key** ✅

**Great! Skip to "Step 1" below!**

---

### **Path B: I Don't Have a Nylas API Key Yet** ⚠️

**You need to get it first! Here's how:**

#### Quick Steps to Get Nylas API Key:

1. **Go to:** https://dashboard.nylas.com/register
2. **Sign up** (or login if you already have account)
3. **Verify your email** (check inbox)
4. **Create a new app:**
   - Click **"Create a New App"** or **"New Application"**
   - App Name: `ProSpaces CRM`
   - Click **"Create"**
5. **Copy your API Key:**
   - You'll see: `API Key: nyk_v0_abc123...`
   - **COPY IT!** Save it somewhere (you'll need it in 30 seconds)
6. **Keep that tab open** - you'll need Nylas Dashboard later!

**Got your Nylas API key?** ✅ Now continue to Step 1 below!

---

## 📋 THE 3 REMAINING COMMANDS:

### **Step 1: Set Your Nylas API Key** 🔑

**IMPORTANT:** Replace `nyk_v0_YOUR_KEY_HERE` with your ACTUAL Nylas API key!

```bash
supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_KEY_HERE
```

**Example:** If your key is `nyk_v0_abc123xyz`, the command is:
```bash
supabase secrets set NYLAS_API_KEY=nyk_v0_abc123xyz
```

**Expected result:**
```
✓ Finished supabase secrets set.
```

---

### **Step 2: Link Your Supabase Project** 🔗

```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

**You'll be asked:** `Enter your database password:`

#### Don't Know Your Database Password?

1. Open new tab: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/settings/database
2. Scroll to **"Database Password"** section
3. Click **"Reset Database Password"**
4. **Copy the new password**
5. Go back to Codespace
6. **Paste the password** in the terminal
7. Press **Enter**

**Note:** You won't see the password as you type (security feature!)

**Expected result:**
```
✓ Linked to project usorqldwroecyxucmtuw
```

---

### **Step 3: Deploy All 7 Edge Functions** 🚀

**Copy this ENTIRE command** (it's all one line, even though it's long):

```bash
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

**This will take 2-5 minutes!** ⏳

**What you'll see:**
```
Deploying nylas-connect...
Building...
✓ Deployed nylas-connect (v1)

Deploying nylas-callback...
Building...
✓ Deployed nylas-callback (v1)

Deploying nylas-send-email...
Building...
✓ Deployed nylas-send-email (v1)

... (continues for all 7 functions)
```

**WAIT for all 7 to finish!** Don't close the tab!

**Expected result:**
```
✓ Deployed nylas-connect (v1)
✓ Deployed nylas-callback (v1)
✓ Deployed nylas-send-email (v1)
✓ Deployed nylas-sync-emails (v1)
✓ Deployed nylas-webhook (v1)
✓ Deployed nylas-sync-calendar (v1)
✓ Deployed nylas-create-event (v1)
```

---

### **Step 4: Verify Deployment** ✅

```bash
supabase functions list
```

**Expected result:**
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

**All 7 functions deployed?** 🎉 **DEPLOYMENT COMPLETE!**

---

## 🎯 Quick Copy-Paste Summary

```bash
# 1. Set Nylas API key (REPLACE WITH YOUR KEY!)
supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_KEY_HERE

# 2. Link project (enter password when asked)
supabase link --project-ref usorqldwroecyxucmtuw

# 3. Deploy functions (wait 2-5 min)
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event

# 4. Verify
supabase functions list
```

---

## ✅ After All 7 Functions Deploy...

**You've completed Part 4 (Deploy Edge Functions)!** 🎉

**But you're NOT done yet!** You still need to configure Nylas OAuth!

---

## 🔜 WHAT COMES AFTER THIS:

### **Part 5: Configure Microsoft OAuth in Nylas** (10 min)

This is what fixes the **"OAuth Setup Required"** error!

1. Go to Nylas Dashboard: https://dashboard.nylas.com
2. Click your app: **"ProSpaces CRM"**
3. Click **"Integrations"** (left sidebar)
4. Find **"Microsoft"** → Click **"Configure"**
5. Choose **"Use Nylas Hosted Auth"** ← **EASIEST!**
6. Click **"Save"**
7. Should show **"Connected"** status ✅

### **Part 6: Set Redirect URI** (2 min)

Still in Nylas Dashboard:
1. Click your app → **"Settings"**
2. Find **"Allowed Redirect URIs"**
3. Add this URL:
   ```
   https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback
   ```
4. Click **"Save"**

### **Part 7: Test OAuth!** (5 min)

1. Go to: https://pro-spaces.vercel.app/
2. Login
3. Click **"Email"** → **"Add Email Account"**
4. Select **"Microsoft Outlook"**
5. Click **"Connect Microsoft Outlook"**

**Expected result:**
- ✅ Both errors gone!
- ✅ Redirects to Microsoft login
- ✅ OAuth works! 🎉

---

## 📊 Where You Are Now:

```
✅ Part 1: SQL Migration (completed earlier)
✅ Part 2: Nylas Account (need to do if not done yet)
✅ Part 3: Install CLI (DONE!)
✅ Part 4: Login to Supabase (DONE!)
⏳ Part 5: Set Secret + Link + Deploy (NEXT - 3 commands above!)
⬜ Part 6: Configure Microsoft OAuth in Nylas
⬜ Part 7: Test!
```

---

## 🎯 Your Immediate Next Step:

### **RIGHT NOW:**

1. **Do you have Nylas API key?**
   - ✅ **YES** → Run Step 1 above (`supabase secrets set...`)
   - ❌ **NO** → Go to https://dashboard.nylas.com/register first!

2. **After getting key:**
   - Run the 3 commands (Steps 1-3 above)
   - Wait for deployment (2-5 min)
   - Verify with Step 4

3. **After deployment:**
   - Configure Microsoft OAuth (Part 5)
   - Set redirect URI (Part 6)
   - Test! (Part 7)

---

## 📚 Complete Guides:

- **Main guide:** `/FIX_BOTH_OAUTH_ISSUES.md`
- **What you just did:** Part 4 (Deploy Functions)
- **What's next:** Parts 5-7 (Configure Nylas OAuth)

---

## ⚡ TLDR - Do This Right Now:

**If you have Nylas API key:**
```bash
supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_KEY
supabase link --project-ref usorqldwroecyxucmtuw
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

**If you DON'T have Nylas API key:**
1. Go to https://dashboard.nylas.com/register
2. Create account + app
3. Copy API key
4. THEN run the commands above

---

**Ready? Get your Nylas API key and run those 3 commands!** 🚀
