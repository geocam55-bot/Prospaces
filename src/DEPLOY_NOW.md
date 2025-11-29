# 🚀 DEPLOY NOW - ProSpaces CRM to Vercel

## You're Ready! Choose Your Path:

---

## 🎯 Path 1: One Command Deploy (EASIEST)

Open your terminal in this project folder and run:

**Mac/Linux:**
```bash
chmod +x deploy-to-vercel.sh && ./deploy-to-vercel.sh
```

**Windows PowerShell:**
```powershell
.\deploy-to-vercel.ps1
```

**That's it!** The script handles everything automatically.

---

## 🎯 Path 2: Vercel CLI (5 Minutes)

Copy and paste these commands one by one:

```bash
# Step 1: Install Vercel CLI
npm install -g vercel

# Step 2: Login to Vercel (opens browser)
vercel login

# Step 3: Deploy to preview
vercel

# Answer the prompts:
# Set up and deploy? Y
# Project name? prospaces-crm
# Want to override settings? N

# Step 4: Add environment variables
vercel env add VITE_SUPABASE_PROJECT_ID
# Paste: usorqldwroecyxucmtuw
# Select: Production, Preview, Development (press space to select all)

vercel env add VITE_SUPABASE_ANON_KEY
# Paste your anon key from .env file
# Select: Production, Preview, Development

vercel env add VITE_SUPABASE_URL
# Paste: https://usorqldwroecyxucmtuw.supabase.co
# Select: Production, Preview, Development

# Step 5: Deploy to production
vercel --prod
```

🎉 **Done!** Your app is live!

---

## 🎯 Path 3: Vercel Dashboard (Best for GitHub)

### Step 1: Push to GitHub (if not already)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/prospaces-crm.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to https://vercel.com
2. Click **"New Project"**
3. Click **"Import Git Repository"**
4. Select your `prospaces-crm` repository
5. Vercel auto-detects settings (no changes needed)
6. Click **"Environment Variables"** and add:

```
VITE_SUPABASE_PROJECT_ID = usorqldwroecyxucmtuw
VITE_SUPABASE_ANON_KEY = [copy from .env file]
VITE_SUPABASE_URL = https://usorqldwroecyxucmtuw.supabase.co
```

7. Click **"Deploy"**

🎉 **Done!** Wait 2-3 minutes for build to complete.

---

## 📝 After Deployment (IMPORTANT!)

### Update Supabase

Your app URL will be something like: `https://prospaces-crm.vercel.app`

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Update:
   - **Site URL:** `https://YOUR_APP.vercel.app`
   - **Redirect URLs:** Add `https://YOUR_APP.vercel.app/**`
5. Click **"Save"**

### Test Your App

1. Visit your Vercel URL
2. Try logging in
3. Test key features
4. Check browser console for errors

---

## 🎊 Success!

Your ProSpaces CRM is now live on Vercel!

### Your URLs

- **Production:** Check Vercel dashboard
- **Supabase:** https://usorqldwroecyxucmtuw.supabase.co

### What Happens Next?

- Every push to `main` branch → Auto-deploys to production
- Pull requests → Creates preview deployments
- Vercel handles SSL, CDN, and performance automatically

---

## 🆘 Need Help?

| Issue | Solution |
|-------|----------|
| Build fails | Run `npm run build` locally first |
| Can't login | Update Supabase redirect URLs |
| Env vars missing | Add them in Vercel dashboard |
| 404 errors | `vercel.json` already configured ✅ |

**Full Guides:**
- `DEPLOY_QUICK_START.md` - Quick reference
- `VERCEL_DEPLOYMENT_GUIDE.md` - Detailed walkthrough
- `DEPLOYMENT_CHECKLIST.md` - Complete checklist

---

## 🚀 Ready? Pick a path above and deploy!

**Recommendation:** Path 1 (automated script) is easiest, Path 3 (GitHub + Dashboard) is best for teams.
