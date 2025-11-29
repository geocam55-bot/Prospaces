# 🎯 Deploy ProSpaces CRM - The 3-Step Method

## The Fastest Way to Get Your CRM Live

---

## Before You Start (2 minutes)

Get your Supabase credentials:

1. Go to [app.supabase.com](https://app.supabase.com)
2. Open your project
3. Settings → API
4. Copy these two things:

```
📋 Project URL: https://xxxxx.supabase.co
📋 Anon Key: eyJhbGci... (very long)
```

**Paste them somewhere safe - you'll need them in Step 3!**

---

## Step 1️⃣: Figma Make → GitHub (5 minutes)

### Download from Figma Make:
1. In Figma Make, click **download/export button** (⬇️ or ⋯ menu)
2. Save ZIP file to your computer
3. Unzip it (right-click → Extract All)

### Upload to GitHub:
1. Go to [github.com](https://github.com) and sign in (or create account)
2. Click **"+"** → **"New repository"**
3. Name: `prospaces-crm`
4. Make it Private ✅
5. Click **"Create repository"**
6. Click the link that says **"uploading an existing file"**
7. Drag your entire project folder into the upload box
8. Scroll down, type: `Initial commit`
9. Click **"Commit changes"**

✅ **Done!** Your code is on GitHub.

---

## Step 2️⃣: Connect Vercel (3 minutes)

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel
5. Click **"Add New..."** → **"Project"**
6. Find `prospaces-crm` and click **"Import"**

✅ **Done!** Vercel is connected to your GitHub.

---

## Step 3️⃣: Configure & Deploy (5 minutes)

### On the "Configure Project" screen:

1. **Framework Preset:** Should say "Vite" ✅

2. **Click "Environment Variables"** (important!)

3. **Add Variable 1:**
   ```
   Name:  VITE_SUPABASE_URL
   Value: [Paste your Project URL from the beginning]
   ```
   Click "Add"

4. **Add Variable 2:**
   ```
   Name:  VITE_SUPABASE_ANON_KEY
   Value: [Paste your Anon Key from the beginning]
   ```
   Click "Add"

5. **Double-check:**
   - Variable names are EXACTLY as shown
   - No extra spaces
   - Both variables added

6. **Click "Deploy"** (big button at bottom)

7. **Wait 2-3 minutes** ⏳

8. **See confetti!** 🎉

---

## 🎉 You're Live!

Vercel shows your URL:
```
https://prospaces-crm-xxxx.vercel.app
```

**Click it to open your CRM!**

---

## ✅ Final Step: Fix Login

So people can actually log in:

1. Go back to [app.supabase.com](https://app.supabase.com)
2. Your project → **Authentication** → **URL Configuration**
3. **Site URL:** Paste your Vercel URL
4. **Redirect URLs:** Add:
   ```
   https://prospaces-crm-xxxx.vercel.app/**
   ```
5. Click **"Save"**

---

## 🔄 Making Updates Later

When you want to change your app:

### Easiest Way - GitHub Desktop:

1. Download [GitHub Desktop](https://desktop.github.com)
2. File → Clone Repository → Choose `prospaces-crm`
3. Make your changes in the files
4. GitHub Desktop shows what changed
5. Type a message (e.g., "Fixed bug")
6. Click "Commit to main"
7. Click "Push origin"
8. Vercel auto-deploys in 2 minutes! ✨

### Web Way:
1. GitHub.com → Your repository
2. Click file → Edit (pencil icon)
3. Make changes
4. Scroll down → "Commit changes"
5. Vercel auto-deploys!

---

## 🆘 Something Wrong?

### White screen?
→ Check environment variables in Vercel settings

### Can't login?
→ Add Vercel URL to Supabase allowed URLs (see "Final Step" above)

### Build failed?
→ Click the failed deployment in Vercel to see error logs

### Still stuck?
→ See `/DEPLOY_TO_VERCEL_STEP_BY_STEP.md` for troubleshooting

---

## 💰 Cost: $0/month

Both Vercel and Supabase are free for your CRM! 🎉

---

## 📱 Share Your App

Your team can now access:
```
https://your-app.vercel.app
```

From any device, anywhere! 🌍

---

## ✨ That's It!

**3 steps. 15 minutes. Live CRM!** 🚀

Need more details? See other guides in your project folder.

**Happy CRM-ing!** 💼
