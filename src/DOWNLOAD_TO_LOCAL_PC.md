# 💾 Download ProSpaces CRM to Your Local PC

## Quick Guide: Get Your Project Files

---

## Step 1️⃣: Download from Figma Make

### Option A: Download All Files (Recommended)

1. **Look for the download/export button** in Figma Make interface
   - Usually in the top-right corner
   - Might be labeled "Download", "Export", or a download icon (⬇️)

2. **Click to download**
   - This will download a ZIP file containing all your project files
   - The file will be named something like `prospaces-crm.zip`

3. **Check your Downloads folder**
   - Windows: `C:\Users\YourName\Downloads\`
   - Mac: `/Users/YourName/Downloads/`

### Option B: If No Download Button

If Figma Make doesn't have an obvious download button:
1. Look for **File** → **Export** or **Download**
2. Check for a **⋮** (three dots) menu
3. Try right-clicking in the file explorer

---

## Step 2️⃣: Extract the Files

### Windows:
1. **Find the ZIP file** in your Downloads folder
2. **Right-click** on `prospaces-crm.zip`
3. Select **"Extract All..."**
4. Choose a location (recommended: `C:\Users\YourName\Documents\prospaces-crm`)
5. Click **"Extract"**

### Mac:
1. **Find the ZIP file** in your Downloads folder
2. **Double-click** `prospaces-crm.zip` to extract
3. **Move the extracted folder** to your desired location
   - Recommended: `~/Documents/prospaces-crm`

---

## Step 3️⃣: Install Required Software

### A. Install Node.js (Required)

1. **Download Node.js**
   - Go to [nodejs.org](https://nodejs.org)
   - Download the **LTS version** (recommended)
   - Windows: Download the `.msi` installer
   - Mac: Download the `.pkg` installer

2. **Install Node.js**
   - Run the installer
   - Click "Next" through all prompts
   - Use default settings

3. **Verify installation**
   - Open **Command Prompt** (Windows) or **Terminal** (Mac)
   - Type: `node --version`
   - Should show: `v20.x.x` or similar
   - Type: `npm --version`
   - Should show: `10.x.x` or similar

### B. Install Git (Required for Deployment)

1. **Download Git**
   - Go to [git-scm.com/downloads](https://git-scm.com/downloads)
   - Download for your operating system

2. **Install Git**
   - Windows: Run installer, use default settings
   - Mac: Run installer or use `brew install git`

3. **Verify installation**
   - Open Command Prompt/Terminal
   - Type: `git --version`
   - Should show: `git version 2.x.x`

### C. Install a Code Editor (Recommended)

**Visual Studio Code** (free, most popular):
1. Go to [code.visualstudio.com](https://code.visualstudio.com)
2. Download and install
3. Open it after installation

**Alternatives:**
- Sublime Text
- Atom
- WebStorm (paid)

---

## Step 4️⃣: Set Up Your Project

### A. Navigate to Your Project

**Windows Command Prompt:**
```cmd
cd C:\Users\YourName\Documents\prospaces-crm
```

**Mac Terminal:**
```bash
cd ~/Documents/prospaces-crm
```

**OR** use VS Code:
1. Open Visual Studio Code
2. Click **File** → **Open Folder**
3. Select your `prospaces-crm` folder
4. Click **Select Folder**

### B. Install Dependencies

In your terminal/command prompt (inside the project folder):

```bash
npm install
```

This will:
- Download all required packages
- Take 2-5 minutes
- Create a `node_modules` folder

**Wait for it to complete!** You'll see a progress bar.

### C. Create Environment Variables File

1. **Find the file** `.env.example` in your project
2. **Copy it** and rename to `.env` (or `.env.local`)
3. **Open the new `.env` file** in your code editor
4. **Fill in your Supabase credentials:**

```env
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

**Where to get these:**
- Go to [app.supabase.com](https://app.supabase.com)
- Select your project
- Go to **Settings** → **API**
- Copy **Project URL** and **anon/public key**

---

## Step 5️⃣: Run Your App Locally

### Start the Development Server

In your terminal (inside the project folder):

```bash
npm run dev
```

You should see output like:
```
  VITE v5.x.x  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Open in Browser

1. **Open your web browser**
2. **Go to:** `http://localhost:5173`
3. **You should see your ProSpaces CRM!** 🎉

### Test It

- Try logging in
- Create a test contact
- Make sure everything works

### Stop the Server

When you're done testing:
- Press **Ctrl+C** in the terminal
- Type **Y** to confirm (if asked)

---

## Step 6️⃣: Project Structure

Your downloaded project should have this structure:

```
prospaces-crm/
├── components/           ← All React components
├── utils/               ← Utility functions
├── styles/              ← CSS files
├── public/              ← Static assets
├── supabase/            ← Supabase functions & migrations
├── App.tsx              ← Main app file
├── package.json         ← Dependencies list
├── vercel.json          ← Deployment config
├── .env.example         ← Environment template
├── .gitignore           ← Git ignore rules
└── [Deployment guides]  ← All the .md files
```

---

## 🎯 Next Steps: Deploy to Vercel

Now that your project is on your local PC:

1. ✅ **Make sure it runs locally** (Step 5 above)
2. ✅ **Read:** `START_DEPLOYMENT_HERE.md`
3. ✅ **Follow:** `DEPLOY_QUICK_REFERENCE.md`
4. ✅ **Deploy to Vercel!**

---

## 🛠️ Common Issues & Solutions

### ❌ "npm: command not found"

**Problem:** Node.js not installed or not in PATH

**Solution:**
1. Install Node.js from [nodejs.org](https://nodejs.org)
2. Restart your terminal/command prompt
3. Try again

### ❌ "EACCES: permission denied"

**Problem:** Permissions issue (usually Mac/Linux)

**Solution:**
```bash
sudo npm install
```

Or fix npm permissions: [docs.npmjs.com/resolving-eacces-permissions-errors](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)

### ❌ Port 5173 already in use

**Problem:** Another app is using the port

**Solution:**
- Close other development servers
- Or change port: `npm run dev -- --port 3000`

### ❌ "Cannot connect to Supabase"

**Problem:** .env file not set up correctly

**Solution:**
1. Make sure you created `.env` file (not `.env.example`)
2. Check credentials are correct
3. No spaces before/after the values
4. Restart dev server (`Ctrl+C`, then `npm run dev` again)

### ❌ White screen or errors

**Problem:** Dependencies not installed

**Solution:**
```bash
npm install
npm run dev
```

---

## 💻 Useful Commands

Once your project is set up locally:

### Start development server:
```bash
npm run dev
```

### Build for production (test):
```bash
npm run build
```

### Preview production build:
```bash
npm run preview
```

### Install a new package:
```bash
npm install package-name
```

### Check for updates:
```bash
npm outdated
```

---

## 📁 Where to Save Your Project

### Windows:
- ✅ **Recommended:** `C:\Users\YourName\Documents\prospaces-crm`
- ✅ **Alternative:** `C:\Users\YourName\Projects\prospaces-crm`
- ❌ **Avoid:** Desktop (can get messy)

### Mac:
- ✅ **Recommended:** `~/Documents/prospaces-crm`
- ✅ **Alternative:** `~/Developer/prospaces-crm`
- ❌ **Avoid:** Desktop

---

## 🔄 Keeping Files in Sync

### If you make changes in Figma Make:
1. Download the project again
2. Copy new/changed files to your local version
3. OR start fresh with new download

### If you make changes locally:
1. Your local version becomes the "source of truth"
2. Push to GitHub (see deployment guides)
3. Vercel deploys automatically

**Recommendation:** Once you download locally, make all changes locally (not in Figma Make).

---

## ✅ Verification Checklist

Before moving to deployment, verify:

- [ ] Node.js installed (`node --version` works)
- [ ] Git installed (`git --version` works)
- [ ] Project extracted to a folder
- [ ] `npm install` completed successfully
- [ ] `.env` file created with Supabase credentials
- [ ] `npm run dev` starts the server
- [ ] App opens at http://localhost:5173
- [ ] Can login/test basic features
- [ ] Code editor (VS Code) installed and working

---

## 🎉 You're Ready!

Once your app runs locally, you can:

1. **Develop locally** - Make changes, test features
2. **Deploy to Vercel** - Follow `DEPLOY_QUICK_REFERENCE.md`
3. **Share with team** - Once deployed, anyone can access it

---

## 📞 Need More Help?

### Installation Issues:
- Node.js docs: [nodejs.org/docs](https://nodejs.org/docs)
- npm docs: [docs.npmjs.com](https://docs.npmjs.com)

### Code Editor:
- VS Code docs: [code.visualstudio.com/docs](https://code.visualstudio.com/docs)

### Git:
- Git guide: [git-scm.com/doc](https://git-scm.com/doc)
- GitHub Desktop: [desktop.github.com](https://desktop.github.com)

---

## 🚀 Next: Deploy to Vercel

Once everything is running locally:

→ Open **[START_DEPLOYMENT_HERE.md](./START_DEPLOYMENT_HERE.md)**

→ Then follow **[DEPLOY_QUICK_REFERENCE.md](./DEPLOY_QUICK_REFERENCE.md)**

**You're almost there!** 🎯
