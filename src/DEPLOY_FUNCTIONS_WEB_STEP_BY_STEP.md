# 🌐 Deploy Edge Functions - Web-Only Step-by-Step

## ✅ Good News: This IS Web-Based!

**GitHub Codespaces = VS Code in your browser!** No software to install!

---

## 📸 VISUAL WALKTHROUGH

### STEP 1: Find Your GitHub Repository

#### 1.1 - Go to GitHub
Open your web browser and go to:
```
https://github.com/YOUR_USERNAME
```
Replace `YOUR_USERNAME` with your actual GitHub username.

#### 1.2 - Find Your Repo
Look for your ProSpaces CRM repository. It might be named:
- `prospaces-crm`
- `prospace-crm`
- `crm`
- Or whatever you named it when you exported from Figma Make

**Can't find it?**
- Click **"Repositories"** tab on your GitHub profile
- Look through the list
- Or go to: https://github.com/YOUR_USERNAME?tab=repositories

#### 1.3 - Open the Repository
Click on the repository name to open it.

---

### STEP 2: Open GitHub Codespaces (Web-Based!)

#### 2.1 - Look for the Green Button
On your repository page, you'll see a **green button** that says:
```
<> Code
```
Click it!

#### 2.2 - What You'll See
A dropdown menu appears with 3 tabs:
```
┌─────────────────────────────────┐
│ Local  |  HTTPS  |  Codespaces  │
└─────────────────────────────────┘
```

Click the **"Codespaces"** tab!

#### 2.3 - Create Codespace
You'll see a button that says:
```
[+ Create codespace on main]
```
Click it!

#### 2.4 - Wait for Loading
A new browser tab opens showing:
```
Setting up your codespace...
Loading...
```

**This takes 1-3 minutes.** Be patient! ☕

---

### STEP 3: VS Code Opens in Your Browser!

#### 3.1 - What You'll See
After loading, you'll see **VS Code** running **IN YOUR BROWSER**:

```
┌────────────────────────────────────────────────────────┐
│  File  Edit  Selection  View  Terminal  Help          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  📁 EXPLORER                   📄 File Editor         │
│  ├─ 📁 supabase                                       │
│  ├─ 📁 components                                     │
│  ├─ 📁 utils                                          │
│  └─ 📄 App.tsx                                        │
│                                                        │
├────────────────────────────────────────────────────────┤
│  💻 TERMINAL                                          │
│  bash-5.1$                                             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**This is all in your web browser!** No installation needed! 🎉

---

### STEP 4: Open the Terminal (Bottom Panel)

#### 4.1 - Find the Terminal
Look at the **bottom** of the screen. You should see a panel that says:
```
💻 TERMINAL    PROBLEMS    OUTPUT    DEBUG CONSOLE
```

If you **don't see it**, click the top menu:
```
Terminal → New Terminal
```

#### 4.2 - What the Terminal Looks Like
You'll see something like:
```
┌────────────────────────────────────────────┐
│ 💻 TERMINAL                                │
├────────────────────────────────────────────┤
│                                            │
│ @YOUR_USERNAME ➜ /workspaces/your-repo $  │
│                                            │
└────────────────────────────────────────────┘
```

The `$` means it's ready for you to type commands!

---

### STEP 5: Run Command 1 - Install Supabase CLI

#### 5.1 - Copy This Command
```bash
npm install -g supabase
```

#### 5.2 - Paste in Terminal
- Click in the terminal (where you see the `$`)
- **Right-click** and select **"Paste"**
- Or press **Ctrl+V** (Windows/Linux) or **Cmd+V** (Mac)
- Press **Enter**

#### 5.3 - What You'll See
The terminal will show:
```
npm install -g supabase

added 1 package in 15s
✓ Supabase CLI installed
```

**Wait for it to finish!** Takes about 30 seconds.

#### 5.4 - Verify It Worked
Type this command:
```bash
supabase --version
```

You should see:
```
1.x.x
```

If you see a version number, it worked! ✅

---

### STEP 6: Run Command 2 - Login to Supabase

#### 6.1 - Copy This Command
```bash
supabase login
```

#### 6.2 - Paste and Press Enter

#### 6.3 - What You'll See
The terminal will show:
```
supabase login

Please click the link below to authorize the CLI:

https://api.supabase.com/v1/cli/authorize?token=ABC123...
```

#### 6.4 - Click the Link
- **Click the URL** in the terminal (it's clickable!)
- A **new browser tab** opens
- You'll see: "Authorize Supabase CLI"
- Click **"Authorize"**

#### 6.5 - Go Back to Codespace Tab
Switch back to the Codespace browser tab.

#### 6.6 - Verify Success
You should see:
```
✓ Logged in successfully
```

---

### STEP 7: Run Command 3 - Set Nylas API Key

#### 7.1 - Get Your Nylas API Key
**IMPORTANT:** You need your Nylas API key from Part 2!

If you don't have it yet:
1. Go to https://dashboard.nylas.com
2. Sign up / login
3. Create app: "ProSpaces CRM"
4. **Copy the API Key** (looks like `nyk_v0_abc123...`)

#### 7.2 - Copy This Command (EDIT IT FIRST!)
```bash
supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_KEY_HERE
```

**REPLACE `nyk_v0_YOUR_KEY_HERE` with your ACTUAL Nylas API key!**

For example, if your key is `nyk_v0_abc123xyz`, the command should be:
```bash
supabase secrets set NYLAS_API_KEY=nyk_v0_abc123xyz
```

#### 7.3 - Paste and Press Enter

#### 7.4 - What You'll See
```
✓ Finished supabase secrets set.
```

---

### STEP 8: Run Command 4 - Link Supabase Project

#### 8.1 - Copy This Command
```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

#### 8.2 - Paste and Press Enter

#### 8.3 - Enter Database Password
You'll be asked:
```
Enter your database password:
```

**Don't know your password?**
1. Open a new browser tab
2. Go to: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/settings/database
3. Scroll to "Database Password"
4. Click **"Reset Database Password"**
5. **Copy the new password**
6. Go back to Codespace tab
7. **Paste the password** in the terminal
8. Press **Enter**

**Note:** When you type the password, you won't see it (for security). That's normal!

#### 8.4 - What You'll See
```
✓ Linked to project usorqldwroecyxucmtuw
```

---

### STEP 9: Run Command 5 - Deploy Functions

#### 9.1 - Copy This ENTIRE Command (One Line!)
```bash
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

**IMPORTANT:** That's ONE command, even though it's long!

#### 9.2 - Paste and Press Enter

#### 9.3 - Wait for Deployment
This takes **2-5 minutes**. You'll see:
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

**Don't close the browser tab!** Wait for all 7 to finish.

#### 9.4 - Verify All Deployed
After it finishes, run this command:
```bash
supabase functions list
```

You should see:
```
┌──────────────────────┬────────────┬─────────┐
│ Name                 │ Status     │ Version │
├──────────────────────┼────────────┼─────────┤
│ nylas-connect        │ deployed   │ v1      │
│ nylas-callback       │ deployed   │ v1      │
│ nylas-send-email     │ deployed   │ v1      │
│ nylas-sync-emails    │ deployed   │ v1      │
│ nylas-webhook        │ deployed   │ v1      │
│ nylas-sync-calendar  │ deployed   │ v1      │
│ nylas-create-event   │ deployed   │ v1      │
└──────────────────────┴────────────┴─────────┘
```

All 7 functions! ✅

---

### STEP 10: Close Codespace (Optional)

#### 10.1 - You're Done!
You can now close the Codespace browser tab.

The Edge Functions are deployed to Supabase and will keep running!

#### 10.2 - If You Need It Again
Just go back to your GitHub repo and click:
```
Code → Codespaces → Open existing codespace
```

---

## 🎉 SUCCESS!

You just deployed 7 Edge Functions using only your web browser! 🚀

**No software installed on your computer!** Everything ran in the cloud!

---

## 📋 Quick Recap - All 5 Commands

```bash
# 1. Install CLI
npm install -g supabase

# 2. Login
supabase login
# (click the link that appears, authorize, come back)

# 3. Set secret (replace with YOUR key!)
supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_KEY_HERE

# 4. Link project
supabase link --project-ref usorqldwroecyxucmtuw
# (enter database password when asked)

# 5. Deploy all functions (one command!)
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event

# 6. Verify (bonus command)
supabase functions list
```

---

## 🆘 Common Issues

### "I don't see the Codespaces tab"
**Fix:** You might not have access. Try:
1. Make sure you're logged into GitHub
2. Free GitHub accounts have limited Codespaces hours
3. Or try StackBlitz (alternative): https://stackblitz.com

### "Terminal won't accept my password"
**Fix:** When typing password, you won't see characters. That's normal!
- Just type (or paste) and press Enter
- Or reset password in Supabase Dashboard

### "npm: command not found"
**Fix:** Codespace didn't load correctly
- Close the tab
- Go back to GitHub repo
- Create new Codespace

### "Function deployment failed"
**Fix:** Make sure you're in the right directory
```bash
# Check where you are:
pwd

# Should show:
/workspaces/YOUR_REPO_NAME

# If not, try:
cd /workspaces/YOUR_REPO_NAME
```

---

## ✅ Next Steps

After deploying functions:
1. Go to ProSpaces CRM
2. Click Email → Add Account
3. Click "Connect Microsoft Outlook"
4. Should work! No more "Unable to connect to email backend" error! 🎉

---

## 🎯 Remember

**GitHub Codespaces = Cloud-based VS Code in your browser**

✅ No installation needed  
✅ Works on any computer  
✅ Just need a web browser  
✅ Perfect for web-only workflows!  

---

**You've got this!** 💪 It's just 5 commands in a browser-based terminal!
