# 📋 ProSpaces CRM - Deployment Checklist

Use this checklist to ensure a smooth deployment to Vercel.

---

## Pre-Deployment Checklist

### ✅ Files Created & Configured

- [x] `vercel.json` - Vercel configuration
- [x] `.env` - Local environment variables
- [x] `.gitignore` - Prevents secrets from being committed
- [x] `/utils/supabase/info.tsx` - Updated to use env variables
- [x] Deployment scripts created (`.sh` and `.ps1`)
- [x] Documentation created

### ✅ Environment Variables Ready

- [x] `VITE_SUPABASE_PROJECT_ID` = `usorqldwroecyxucmtuw`
- [x] `VITE_SUPABASE_ANON_KEY` = Available in `.env` file
- [x] `VITE_SUPABASE_URL` = `https://usorqldwroecyxucmtuw.supabase.co`

### ✅ Supabase Configuration

- [ ] Database tables created and migrated
- [ ] RLS policies configured
- [ ] Authentication enabled
- [ ] Email templates configured (if using email auth)
- [ ] Super Admin account created

### ✅ Code Ready

- [ ] App builds successfully locally (`npm run build`)
- [ ] App runs locally without errors (`npm run dev`)
- [ ] All features tested locally
- [ ] No console errors in browser

---

## Deployment Steps

### Choose Your Deployment Method:

**Method 1: Automated Script (Recommended)**
```bash
# Mac/Linux
./deploy-to-vercel.sh

# Windows
.\deploy-to-vercel.ps1
```

**Method 2: Vercel CLI**
```bash
vercel login
vercel
vercel env add VITE_SUPABASE_PROJECT_ID
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_SUPABASE_URL
vercel --prod
```

**Method 3: Vercel Dashboard**
1. Import from GitHub
2. Add environment variables
3. Deploy

---

## Post-Deployment Checklist

### ✅ Vercel Configuration

- [ ] Deployment successful
- [ ] Production URL obtained (e.g., `prospaces-crm.vercel.app`)
- [ ] Environment variables added to Vercel
- [ ] Build logs show no errors

### ✅ Supabase Updates

Go to [Supabase Dashboard](https://supabase.com/dashboard) → Project → Authentication → URL Configuration

- [ ] **Site URL** updated to Vercel URL
- [ ] **Redirect URLs** includes:
  - `https://your-app.vercel.app/**`
  - `https://your-app.vercel.app/auth/callback`

### ✅ Testing

Visit your production URL and test:

- [ ] Homepage loads
- [ ] Sign in works
- [ ] Dashboard loads
- [ ] Contacts module works
- [ ] Tasks module works
- [ ] Bids module works
- [ ] Opportunities module works
- [ ] Reports module works
- [ ] Settings module works
- [ ] User permissions work correctly
- [ ] No console errors

### ✅ Performance

- [ ] Page load time is acceptable (< 3 seconds)
- [ ] No failed network requests
- [ ] Images load properly
- [ ] Routing works (no 404s)

### ✅ Security

- [ ] Environment variables not exposed in browser
- [ ] RLS policies working correctly
- [ ] Only authorized users can access data
- [ ] Admin features restricted to admins

---

## Optional Enhancements

### Custom Domain

- [ ] Domain purchased
- [ ] Domain added in Vercel dashboard
- [ ] DNS configured
- [ ] SSL certificate active
- [ ] Supabase URLs updated with custom domain

### Monitoring & Analytics

- [ ] Error tracking set up (e.g., Sentry)
- [ ] Analytics configured (e.g., Vercel Analytics)
- [ ] Uptime monitoring (e.g., UptimeRobot)

### Team Setup

- [ ] Team members invited to Vercel project
- [ ] Team members invited to Supabase project
- [ ] Access levels configured

### Backups

- [ ] Supabase automatic backups enabled
- [ ] Backup schedule configured
- [ ] Recovery process documented

---

## Quick Reference

### Your Configuration

```
Project: ProSpaces CRM
Supabase Project ID: usorqldwroecyxucmtuw
Supabase URL: https://usorqldwroecyxucmtuw.supabase.co
Framework: React + Vite
Hosting: Vercel
```

### Useful Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls

# Open project in browser
vercel open
```

### Important Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://supabase.com/dashboard/project/usorqldwroecyxucmtuw
- **Documentation:** See `VERCEL_DEPLOYMENT_GUIDE.md`
- **Quick Start:** See `DEPLOY_QUICK_START.md`

---

## Troubleshooting

### Build Fails

**Issue:** Module not found or dependency errors

**Solution:**
```bash
npm install
npm run build  # Test locally first
git add .
git commit -m "Fix dependencies"
git push
```

### Environment Variables Not Working

**Issue:** App can't connect to Supabase

**Solution:**
1. Check variable names start with `VITE_`
2. Verify values in Vercel dashboard
3. Re-deploy after adding variables

### Supabase Connection Issues

**Issue:** Auth errors or data not loading

**Solution:**
1. Verify environment variables are correct
2. Check Supabase RLS policies
3. Update Supabase redirect URLs
4. Check browser console for specific errors

### Routing Issues (404 on refresh)

**Issue:** Page refreshes result in 404

**Solution:**
- Verify `vercel.json` has correct rewrites (already configured ✅)

---

## Need Help?

1. **Check documentation:** Start with `VERCEL_DEPLOYMENT_GUIDE.md`
2. **Vercel Support:** https://vercel.com/support
3. **Supabase Support:** https://supabase.com/support
4. **Community:** 
   - Vercel Discord: https://vercel.com/discord
   - Supabase Discord: https://discord.supabase.com

---

## Status

**Deployment Status:** ⏳ Ready to Deploy

**Last Updated:** $(date)

**Next Step:** Run deployment script or follow manual steps above

---

🚀 **Ready to go live!** Choose your deployment method and launch ProSpaces CRM!
