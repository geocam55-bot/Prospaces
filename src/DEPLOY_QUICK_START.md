# 🚀 Quick Start: Deploy ProSpaces CRM to Vercel

This is the fastest way to get your ProSpaces CRM deployed to Vercel.

---

## ⚡ Super Quick Deploy (2 minutes)

### Option A: Automated Script (Easiest)

**Mac/Linux:**
```bash
chmod +x deploy-to-vercel.sh
./deploy-to-vercel.sh
```

**Windows (PowerShell):**
```powershell
.\deploy-to-vercel.ps1
```

The script will:
1. ✅ Install Vercel CLI (if needed)
2. ✅ Login to Vercel
3. ✅ Deploy to preview
4. ✅ Add environment variables
5. ✅ Deploy to production

---

### Option B: Manual Steps (5 minutes)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy preview
vercel

# 4. Add environment variables (run for each variable)
vercel env add VITE_SUPABASE_PROJECT_ID
# Enter: usorqldwroecyxucmtuw

vercel env add VITE_SUPABASE_ANON_KEY
# Enter: your-anon-key-from-env-file

vercel env add VITE_SUPABASE_URL
# Enter: https://usorqldwroecyxucmtuw.supabase.co

# 5. Deploy to production
vercel --prod
```

---

### Option C: Vercel Dashboard (Best for Teams)

1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Import from GitHub
4. Add environment variables (see below)
5. Click **"Deploy"**

**Environment Variables to Add:**
```
VITE_SUPABASE_PROJECT_ID = usorqldwroecyxucmtuw
VITE_SUPABASE_ANON_KEY = [from your .env file]
VITE_SUPABASE_URL = https://usorqldwroecyxucmtuw.supabase.co
```

---

## 🔧 After Deployment

### 1. Update Supabase Settings

Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project

**Authentication → URL Configuration:**
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/**`

### 2. Test Your App

Visit your Vercel URL and verify:
- ✅ Login works
- ✅ Data loads
- ✅ All features work

---

## 📚 Need More Help?

- **Detailed Guide:** See `VERCEL_DEPLOYMENT_GUIDE.md`
- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs

---

## 🐛 Troubleshooting

**"Module not found" error:**
```bash
npm install
git add .
git commit -m "Update dependencies"
git push
```

**Environment variables not working:**
- Check they start with `VITE_`
- Re-deploy after adding them

**Supabase connection fails:**
- Verify environment variables
- Check Supabase URL configuration

---

## ✅ Your App Info

- **Supabase Project:** `usorqldwroecyxucmtuw`
- **Supabase URL:** `https://usorqldwroecyxucmtuw.supabase.co`
- **Vercel Config:** `vercel.json` ✅
- **Environment Template:** `.env` ✅

---

**Ready to deploy?** Choose one of the options above and you'll be live in minutes! 🎉
