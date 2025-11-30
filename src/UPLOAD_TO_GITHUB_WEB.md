# 📤 Upload ProSpaces CRM from Figma Make to GitHub (Web Method)

## Overview

Since you're working in Figma Make (web browser), you need to:
1. ✅ Download your project files from Figma Make
2. ✅ Upload them to GitHub via web interface

---

## 🎯 Method 1: GitHub Web Upload (Easiest)

### Step 1: Download Your Project from Figma Make

1. **In Figma Make**, look for the **Download** or **Export** button
   - Usually in the top-right corner
   - Or in a menu (⋯ three dots icon)

2. **Select "Download Project" or "Download as ZIP"**
   - This downloads all your files as a .zip file

3. **Unzip the downloaded file**
   - On Windows: Right-click → "Extract All"
   - On Mac: Double-click the .zip file
   - You should see a folder with all your code files

### Step 2: Create GitHub Repository

1. **Go to [github.com](https://github.com)**

2. **Sign in** to your GitHub account (or create one if you don't have it)

3. **Click the "+" icon** in top-right corner → **"New repository"**

4. **Fill in the details:**
   ```
   Repository name: prospaces-crm
   Description: Multi-tenant CRM platform with role-based access control
   
   ✅ Public (if you want it visible to everyone)
   OR
   ✅ Private (recommended - keeps your code private)
   
   ⚠️ DO NOT check "Add a README file"
   ⚠️ DO NOT add .gitignore or license yet
   ```

5. **Click "Create repository"**

### Step 3: Upload Files via GitHub Web

You'll see a page that says "Quick setup". Look for:

**"uploading an existing file"** link (in the middle of the instructions)

1. **Click "uploading an existing file"**

2. **Drag and drop your ENTIRE project folder** into the upload area
   - Or click "choose your files" and select all files
   
3. ⚠️ **IMPORTANT:** Make sure you're uploading:
   - All `.tsx` files
   - All `.ts` files  
   - All `.css` files
   - The `package.json` file
   - The `vercel.json` file
   - The `.gitignore` file
   - All folders: `components/`, `utils/`, `styles/`, etc.

4. **Scroll down** to the commit section

5. **Write a commit message:**
   ```
   Initial commit - ProSpaces CRM
   ```

6. **Click "Commit changes"**

7. **Wait for upload to complete** (may take 1-2 minutes)

---

## 🎯 Method 2: GitHub Desktop (Recommended)

This is easier for ongoing updates!

### Step 1: Download Your Project from Figma Make

Same as Method 1 - download and unzip your project.

### Step 2: Install GitHub Desktop

1. **Download GitHub Desktop**
   - Go to [desktop.github.com](https://desktop.github.com)
   - Download for Windows or Mac
   - Install it

2. **Sign in with your GitHub account**

### Step 3: Create Repository from Your Folder

1. **Open GitHub Desktop**

2. **Click File → Add Local Repository**

3. **Browse to your unzipped project folder**

4. **If it says "This directory does not appear to be a Git repository":**
   - Click **"Create a repository"**
   - Repository name: `prospaces-crm`
   - Keep other defaults
   - Click **"Create Repository"**

5. **You'll see all your files listed**

6. **Write a commit message** at the bottom:
   ```
   Initial commit - ProSpaces CRM
   ```

7. **Click "Commit to main"**

8. **Click "Publish repository"** at the top
   - Choose a name: `prospaces-crm`
   - Uncheck "Keep this code private" OR keep it checked (recommended)
   - Click **"Publish Repository"**

**Done!** Your code is now on GitHub!

---

## ⚠️ Important: Remove .env Files Before Uploading

Before uploading to GitHub, make sure you:

### Check for .env files:
1. Look in your downloaded project folder
2. Delete any files named:
   - `.env`
   - `.env.local`
   - `.env.development`
   - `.env.production`

### Why?
These files contain your Supabase credentials (API keys). **Never upload them to GitHub!**

### What about .env.example?
The `.env.example` file is SAFE to upload - it's just a template without real credentials.

---

## 📋 Files You MUST Upload

Make sure these are in your GitHub repository:

### Configuration Files:
- [x] `package.json` - Lists all dependencies
- [x] `vercel.json` - Vercel deployment config
- [x] `.gitignore` - Prevents sensitive files from being committed
- [x] `.env.example` - Template for environment variables

### Source Code:
- [x] `App.tsx` - Main app file
- [x] `components/` folder - All React components
- [x] `utils/` folder - Utility functions
- [x] `styles/` folder - CSS files
- [x] `supabase/` folder - Supabase functions

### Optional (but helpful):
- [x] `README.md` - Project documentation
- [x] All deployment guide `.md` files

---

## 🚫 Files You Should NOT Upload

The `.gitignore` file prevents these from being uploaded:

- ❌ `.env` - Contains your actual API keys
- ❌ `.env.local` - Local environment variables
- ❌ `node_modules/` - Dependencies (too large, installed via npm)
- ❌ `dist/` - Build output
- ❌ `.DS_Store` - Mac system files
- ❌ `Thumbs.db` - Windows system files

---

## ✅ Verify Your Upload

After uploading, check your GitHub repository:

1. **Go to your repository page:**
   ```
   https://github.com/YOUR_USERNAME/prospaces-crm
   ```

2. **You should see:**
   - All your `.tsx` component files
   - `package.json` file
   - `vercel.json` file
   - `.gitignore` file
   - Folders: `components/`, `utils/`, `styles/`, etc.

3. **You should NOT see:**
   - `.env` files with real credentials
   - `node_modules/` folder
   - `dist/` folder

---

## 🔄 Making Updates Later

### Using GitHub Web:
1. Click **"Add file"** → **"Upload files"**
2. Drag and drop updated files
3. Commit changes

**Note:** This overwrites files, doesn't merge changes. Not ideal for ongoing development.

### Using GitHub Desktop (Better):
1. Make changes in your local files
2. Open GitHub Desktop
3. It shows what changed
4. Write commit message
5. Click **"Commit to main"**
6. Click **"Push origin"**

---

## 🎯 After Upload: Deploy to Vercel

Once your code is on GitHub:

1. **Go to [vercel.com](https://vercel.com)**

2. **Sign in with GitHub**

3. **Click "Add New..." → "Project"**

4. **Import your `prospaces-crm` repository**

5. **Add environment variables:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

6. **Click "Deploy"**

See `/DEPLOY_QUICK_REFERENCE.md` for detailed deployment instructions.

---

## 🆘 Troubleshooting

### "Repository already exists"
- You already created it! Just add files to existing repo
- Or use a different name like `prospaces-crm-v2`

### "File size too large"
- GitHub web has 25MB per file limit
- Don't upload `node_modules/` (should be in .gitignore)
- Use GitHub Desktop for large uploads

### "Upload keeps failing"
- Try uploading folders one at a time
- Check your internet connection
- Use GitHub Desktop instead

### "Can't find download button in Figma Make"
- Look for Export, Download, or Share options
- Check the menu (⋯ or ☰ icon)
- You might need to select all files first

---

## 📚 Quick Reference

### Web Upload Method:
```
1. Download project from Figma Make
2. Unzip files
3. Go to github.com → New Repository
4. Click "uploading an existing file"
5. Drag and drop all files
6. Commit changes
```

### GitHub Desktop Method:
```
1. Download project from Figma Make
2. Unzip files
3. Download GitHub Desktop
4. File → Add Local Repository
5. Create Repository
6. Commit to main
7. Publish Repository
```

---

## ✨ Next Steps

After your code is on GitHub:

1. ✅ Verify all files uploaded correctly
2. ✅ Make sure no `.env` files with real credentials are visible
3. ✅ Follow `/DEPLOY_QUICK_REFERENCE.md` to deploy to Vercel
4. ✅ Test your live app!

---

## 🎉 You're Ready!

Once your code is on GitHub, you can deploy to Vercel and your CRM will be live!

**Questions?** Check the other deployment guides in your project folder.

Good luck! 🚀
