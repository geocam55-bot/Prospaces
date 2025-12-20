# ✅ Nylas Edge Functions - Ready to Deploy

## Status: Files Exist in Figma Make ✅

All 7 Nylas Edge Function files exist and are ready:

1. ✅ nylas-connect/index.ts (160 lines)
2. ✅ nylas-callback/index.ts (157 lines)
3. ✅ nylas-send-email/index.ts
4. ✅ nylas-sync-emails/index.ts
5. ✅ nylas-webhook/index.ts
6. ✅ nylas-sync-calendar/index.ts
7. ✅ nylas-create-event/index.ts

---

## 🚀 Next Steps - Deploy from Codespaces

### **Step 1: In Codespaces Terminal**

```bash
# First, check if files are visible
cd /workspaces/ProSpaces
ls -la supabase/functions/nylas-send-email/
```

**Expected output:**
```
total 8
drwxr-xr-x 2 codespace codespace 4096 Dec 20 10:00 .
drwxr-xr-x 17 codespace codespace 4096 Dec 20 10:00 ..
-rw-r--r-- 1 codespace codespace 2134 Dec 20 10:00 index.ts
```

**If you see index.ts** → Great! Skip to Step 2!

**If you DON'T see index.ts:**

```bash
# Try pulling from GitHub
git status
git pull origin main
ls -la supabase/functions/nylas-send-email/
```

**Still don't see it?** See troubleshooting below.

---

### **Step 2: Set Nylas API Key (if not done)**

```bash
supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_ACTUAL_KEY_HERE
```

Replace with your actual Nylas API key from https://dashboard.nylas.com

---

### **Step 3: Link Project (if not done)**

```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

Enter your database password when prompted.

---

### **Step 4: Deploy All Functions** 🚀

```bash
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

**This will take 2-5 minutes!** ⏳

---

### **Step 5: Verify**

```bash
supabase functions list
```

Should show all 7 functions with "deployed" status! ✅

---

## 🆘 Troubleshooting: Files Not Visible in Codespaces

### **Option A: Check Your Current Directory**

```bash
pwd
# Should show: /workspaces/ProSpaces or /workspaces/YOUR_REPO_NAME

# If not in the right place:
cd /workspaces/ProSpaces
# OR
cd /workspaces/YOUR_REPO_NAME
```

---

### **Option B: Verify on GitHub Web**

1. Open your repo: `https://github.com/YOUR_USERNAME/ProSpaces-CRM`
2. Navigate to: `supabase` → `functions` → `nylas-send-email`
3. Do you see `index.ts`?

**IF YES on GitHub but NO in Codespaces:**
```bash
git pull origin main
```

**IF NO on GitHub:**
- The files haven't synced from Figma Make yet
- We need to manually commit them (see below)

---

### **Option C: Check Git Status**

```bash
cd /workspaces/ProSpaces
git status
```

**Does it show untracked Nylas function files?**

If YES, commit them:
```bash
git add supabase/functions/nylas-*
git commit -m "Add Nylas Edge Functions"
git push origin main
```

---

### **Option D: Try Deploying from Current Location**

Maybe the files ARE there but in a different location?

```bash
# Search for the files
find . -name "nylas-send-email" -type d

# If it shows a path, cd to the parent directory
cd /path/to/parent/directory

# Then deploy
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

---

## 🎯 Most Likely Solution

The files exist in Figma Make but need to be committed to GitHub. Try this:

### **In Codespaces:**

```bash
# Check what repo you're in
git remote -v

# Pull latest changes
git fetch origin
git pull origin main

# Force refresh the file listing
ls -R supabase/functions/ | grep nylas

# If files appear, deploy immediately
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

---

## 📊 Quick Diagnostics

Run this in Codespaces and tell me the output:

```bash
echo "=== Current Directory ===" && \
pwd && \
echo "=== Git Status ===" && \
git status && \
echo "=== Nylas Functions ===" && \
ls -la supabase/functions/ | grep nylas && \
echo "=== Check One File ===" && \
ls -la supabase/functions/nylas-send-email/
```

Copy/paste the entire output and I'll tell you exactly what to do!

---

## ✅ After Successful Deployment

Once you see all 7 functions in Supabase Dashboard, you still need to:

1. **Configure Nylas OAuth** (Microsoft integration)
2. **Set redirect URI in Nylas**
3. **Test the connection**

**See:** `/CONFIGURE_NYLAS_OAUTH_NOW.md`

---

**Generated:** December 20, 2024  
**Files confirmed present in Figma Make:** ✅  
**Awaiting deployment to Supabase:** ⏳
