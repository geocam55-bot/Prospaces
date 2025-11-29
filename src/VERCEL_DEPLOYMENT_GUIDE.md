# ProSpaces CRM - Vercel Deployment Guide

This guide will walk you through deploying ProSpaces CRM to Vercel.

## Prerequisites

✅ Supabase project is set up and configured
✅ All database tables and RLS policies are in place
✅ Git repository is ready (GitHub, GitLab, or Bitbucket)

## Your Supabase Configuration

- **Project ID:** `usorqldwroecyxucmtuw`
- **Supabase URL:** `https://usorqldwroecyxucmtuw.supabase.co`
- **Anon Key:** Already configured (see .env file)

---

## Method 1: Deploy via Vercel CLI (Fastest)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate (via email or GitHub).

### Step 3: Deploy to Preview

```bash
vercel
```

When prompted:
- **Set up and deploy?** → Yes (Y)
- **Which scope?** → Choose your personal or team account
- **Link to existing project?** → No (N)
- **Project name?** → `prospaces-crm` (or your preferred name)
- **In which directory is your code?** → `./` (current directory)
- **Want to override settings?** → No (N)

Vercel will:
1. Detect your build settings from `vercel.json`
2. Build your project
3. Deploy to a preview URL (e.g., `prospaces-crm-xyz123.vercel.app`)

### Step 4: Add Environment Variables

After the preview deployment:

```bash
# Add Supabase Project ID
vercel env add VITE_SUPABASE_PROJECT_ID

# When prompted, enter: usorqldwroecyxucmtuw
# Select: Production, Preview, Development

# Add Supabase Anon Key
vercel env add VITE_SUPABASE_ANON_KEY

# When prompted, enter your anon key from .env file
# Select: Production, Preview, Development

# Add Supabase URL
vercel env add VITE_SUPABASE_URL

# When prompted, enter: https://usorqldwroecyxucmtuw.supabase.co
# Select: Production, Preview, Development
```

### Step 5: Deploy to Production

```bash
vercel --prod
```

Your app will be deployed to production! 🎉

---

## Method 2: Deploy via Vercel Dashboard (Recommended for Beginners)

### Step 1: Push Code to GitHub

If you haven't already:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - ProSpaces CRM"

# Create main branch
git branch -M main

# Add remote (replace with your GitHub repo URL)
git remote add origin https://github.com/YOUR_USERNAME/prospaces-crm.git

# Push to GitHub
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New"** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub repository
5. Click **"Import"**

### Step 3: Configure Project

Vercel will auto-detect your settings from `vercel.json`. You should see:

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Step 4: Add Environment Variables

Click on **"Environment Variables"** and add:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_PROJECT_ID` | `usorqldwroecyxucmtuw` |
| `VITE_SUPABASE_ANON_KEY` | `[Your anon key from .env file]` |
| `VITE_SUPABASE_URL` | `https://usorqldwroecyxucmtuw.supabase.co` |

**For each variable:**
- Check ✅ **Production**
- Check ✅ **Preview**
- Check ✅ **Development**

### Step 5: Deploy

Click **"Deploy"** button. Vercel will:
1. Clone your repository
2. Install dependencies
3. Build your project
4. Deploy to production

⏱️ First deployment takes 2-3 minutes.

### Step 6: Get Your URL

Once deployed, you'll see:
- **Production URL:** `https://prospaces-crm.vercel.app` (or custom domain)
- You can also add a custom domain in Vercel project settings

---

## Post-Deployment Configuration

### 1. Update Supabase Authentication URLs

Go to your Supabase Dashboard:

1. Navigate to: **Authentication** → **URL Configuration**
2. Update **Site URL:** `https://your-app.vercel.app`
3. Add to **Redirect URLs:**
   - `https://your-app.vercel.app/**`
   - `https://your-app.vercel.app/auth/callback`

### 2. Update CORS Settings

In Supabase Dashboard → **Project Settings** → **API**:
- Confirm your Vercel domain is in allowed origins

### 3. Test Your Deployment

Visit your Vercel URL and test:
- ✅ Sign in works
- ✅ Data loads from Supabase
- ✅ All modules function correctly
- ✅ No console errors

---

## Continuous Deployment

Once connected to GitHub:
- **Every push to `main` branch** → Auto-deploys to production
- **Pull requests** → Creates preview deployments
- **Other branches** → Creates preview deployments

---

## Troubleshooting

### Build Fails

**Error:** `Module not found`
```bash
# Ensure all dependencies are in package.json
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Environment Variables Not Working

1. Check that variable names start with `VITE_`
2. Re-deploy after adding variables
3. Check Vercel logs for errors

### Supabase Connection Fails

1. Verify environment variables are correct
2. Check Supabase URL configuration
3. Verify RLS policies allow connections

### App Loads but Pages Are Blank

- Check browser console for errors
- Verify Supabase credentials
- Check network tab for API errors

---

## Useful Commands

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs

# Remove deployment
vercel rm [deployment-url]

# Open dashboard
vercel

# Pull environment variables
vercel env pull
```

---

## Custom Domain (Optional)

### Add Custom Domain

1. Go to Vercel Dashboard → Your Project
2. Click **"Settings"** → **"Domains"**
3. Click **"Add Domain"**
4. Enter your domain (e.g., `crm.yourdomain.com`)
5. Follow DNS configuration instructions
6. Update Supabase redirect URLs to include custom domain

---

## Production Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Supabase URLs updated
- [ ] RLS policies tested
- [ ] All features tested on production URL
- [ ] Database backups enabled
- [ ] Error monitoring set up (optional)
- [ ] Analytics configured (optional)
- [ ] Custom domain added (optional)
- [ ] SSL certificate active (automatic on Vercel)

---

## Support

### Vercel Support
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Support](https://vercel.com/support)

### Supabase Support
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)

---

## Next Steps

Once deployed:

1. **Test thoroughly** on production URL
2. **Invite team members** to test
3. **Set up monitoring** (optional)
4. **Configure backups** in Supabase
5. **Add custom domain** (optional)

🎉 **Congratulations!** Your ProSpaces CRM is now live on Vercel!
