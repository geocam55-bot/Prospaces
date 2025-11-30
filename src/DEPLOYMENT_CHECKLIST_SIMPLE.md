# ✅ ProSpaces CRM - Pre-Deployment Checklist

Before you deploy to Vercel, make sure you've completed these items:

---

## 🗄️ Database Setup

- [ ] **Supabase project created**
  - Go to [app.supabase.com](https://app.supabase.com)
  - Create new project or use existing one

- [ ] **All SQL migrations run**
  - [ ] Run `/SUPABASE_SETTINGS_TABLES.sql`
  - [ ] Run `/SQL_MIGRATION_TAX_RATE_2.sql`
  - [ ] Run any other SQL files needed for your features

- [ ] **RLS policies enabled**
  - Check in Supabase → Authentication → Policies
  - Make sure Row Level Security is ON for all tables

- [ ] **Test data added (optional)**
  - Create at least one test organization
  - Create at least one test user/admin

---

## 🔑 Credentials Ready

- [ ] **Supabase URL copied**
  - Location: Supabase → Settings → API → Project URL
  - Format: `https://xxxxx.supabase.co`

- [ ] **Supabase Anon Key copied**
  - Location: Supabase → Settings → API → Project API Keys → anon/public
  - It's a LONG key (300+ characters)
  - ⚠️ Use ANON key, NOT service_role key

---

## 💻 Local Testing

- [ ] **App runs locally**
  - Test command: `npm run dev`
  - Opens at http://localhost:5173

- [ ] **Can login/signup**
  - Create test account
  - Login works

- [ ] **Core features work**
  - [ ] Contacts module loads
  - [ ] Tasks module loads
  - [ ] Bids/Quotes module loads
  - [ ] Settings accessible (for admin)

- [ ] **No console errors**
  - Open browser DevTools (F12)
  - Check Console tab for red errors

---

## 📁 Code Repository

- [ ] **Git installed**
  - Test: Type `git --version` in terminal
  - If not installed: [git-scm.com/downloads](https://git-scm.com/downloads)

- [ ] **GitHub account created**
  - Sign up at [github.com](https://github.com)

- [ ] **`.gitignore` file exists**
  - ✅ Already created for you!
  - Prevents committing sensitive files

- [ ] **`.env` files NOT committed**
  - Your `.env` file should be in `.gitignore`
  - Never commit API keys to GitHub!

---

## 🌐 Vercel Account

- [ ] **Vercel account created**
  - Sign up at [vercel.com](https://vercel.com)
  - Use "Continue with GitHub" option

- [ ] **GitHub authorized**
  - Vercel needs permission to access your repos

---

## 📝 Configuration Files

Already done for you! These files exist:

- [x] `vercel.json` - Vercel configuration
- [x] `.env.example` - Template for environment variables
- [x] `.gitignore` - Prevents sensitive files from being committed
- [x] `package.json` - Dependencies list

---

## 📚 Documentation Read

Quick reference guides available:

- [ ] Read `/DEPLOY_QUICK_REFERENCE.md` (5 min read)
  - **START HERE** - Simplest guide

- [ ] Bookmark `/DEPLOY_TO_VERCEL_STEP_BY_STEP.md`
  - Detailed guide with troubleshooting

---

## 🚀 Ready to Deploy?

If you checked all the boxes above, you're ready!

### Follow these guides in order:

1. **First Time:** `/DEPLOY_QUICK_REFERENCE.md`
   - Quickest path to deployment
   - 3 simple steps

2. **Need Help:** `/DEPLOY_TO_VERCEL_STEP_BY_STEP.md`
   - Detailed instructions
   - Troubleshooting section

3. **After Deploy:** `/IMPLEMENTATION_CHECKLIST.md`
   - Test your deployed app
   - Configure features

---

## 🎯 Quick Command Reference

### Check Git Status
```bash
git status
```

### Start Local Dev Server
```bash
npm run dev
```

### Build for Production (test)
```bash
npm run build
```

### View Build Output
```bash
npm run preview
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ DON'T:
- Commit `.env` files to GitHub
- Use `service_role` key instead of `anon` key
- Deploy without testing locally first
- Forget to add environment variables in Vercel
- Skip SQL migrations

### ✅ DO:
- Use `.env.example` as template
- Test locally before deploying
- Double-check environment variable names
- Run all SQL migrations first
- Add Vercel URL to Supabase allowed URLs after deploy

---

## 🆘 Having Issues?

### Before deploying:
1. Make sure app runs locally: `npm run dev`
2. Check browser console for errors (F12)
3. Verify Supabase connection works

### During deployment:
1. Check build logs in Vercel dashboard
2. Verify environment variables are set
3. Make sure variable names have `VITE_` prefix

### After deployment:
1. Add Vercel URL to Supabase allowed URLs
2. Test login on deployed site
3. Check Vercel logs for runtime errors

---

## 📞 Where to Get Help

- **Vercel Issues:** [vercel.com/docs](https://vercel.com/docs)
- **Supabase Issues:** [supabase.com/docs](https://supabase.com/docs)
- **Git Issues:** [git-scm.com/doc](https://git-scm.com/doc)

---

## ✨ Final Check

Before clicking "Deploy" in Vercel:

```
[ ] Supabase project is ready
[ ] SQL migrations are run
[ ] App works locally
[ ] Code is pushed to GitHub
[ ] Environment variables are ready to paste
[ ] I've read the deployment guide
```

---

## 🎉 You're Ready!

Open `/DEPLOY_QUICK_REFERENCE.md` and follow the 3 steps!

**Estimated time to deploy: 10-15 minutes**

Good luck! 🚀
