# 🎨 Deploy IMAP/SMTP Email from Figma Make

## ✅ You're Using Figma Make - Here's How to Deploy

Figma Make is a web-based app builder with **no terminal access**, so deployment is different. Here are your **3 options**:

---

## 🎯 **Option 1: Export & Deploy Locally** ⭐ **RECOMMENDED**

The easiest way is to deploy the Edge Functions once from your computer, then they work forever with your Figma Make app!

### **Why This Works:**
- Edge Functions deploy to **Supabase** (not your computer)
- Once deployed, they stay there **forever**
- Your Figma Make app **automatically uses them**
- You only need to do this **once**!

---

### **Steps:**

#### **Step 1: Export Project from Figma Make**

1. In Figma Make, look for **Export** or **Download** option
2. Download the project files as a ZIP
3. Extract the ZIP to a folder on your computer
   - Example: `C:\Users\YourName\Downloads\ProSpacesCRM`

---

#### **Step 2: Open Command Prompt**

1. Press **Windows Key + R**
2. Type `cmd`
3. Press **Enter**

---

#### **Step 3: Navigate to Project**

```cmd
cd C:\Users\YourName\Downloads\ProSpacesCRM
```
*(Replace with your actual folder path)*

**Tip:** In File Explorer, click the address bar → Copy path → Paste after `cd `

---

#### **Step 4: Install Prerequisites**

**If you don't have Node.js:**
1. Download from: https://nodejs.org/
2. Install the LTS version
3. Restart Command Prompt
4. Continue below

**Install Supabase CLI:**
```cmd
npm install -g supabase
```
*Press Enter, wait 1-2 minutes*

---

#### **Step 5: Deploy to Supabase**

Copy/paste these commands **ONE AT A TIME**:

```cmd
supabase login
```
*Browser opens → Click "Authorize"*

```cmd
supabase link --project-ref usorqldwroecyxucmtuw
```
*Enter database password when asked*
*Get it from: https://supabase.com/dashboard → Settings → Database*

```cmd
supabase db push
```
*Wait for "Finished supabase db push"*

```cmd
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv
```
*Wait for "Finished supabase secrets set"*

```cmd
supabase functions deploy nylas-connect
```
*Wait for ✓ Deployed*

```cmd
supabase functions deploy nylas-callback
```
*Wait for ✓ Deployed*

```cmd
supabase functions deploy nylas-send-email
```
*Wait for ✓ Deployed*

```cmd
supabase functions deploy nylas-sync-emails
```
*Wait for ✓ Deployed*

---

#### **Step 6: Verify Deployment**

```cmd
supabase functions list
```

You should see:
- ✅ nylas-connect
- ✅ nylas-callback
- ✅ nylas-send-email
- ✅ nylas-sync-emails

---

#### **Step 7: Done! Back to Figma Make**

✅ **Functions are deployed!**

Now:
1. Go back to your **Figma Make app** (in browser)
2. The app will **automatically use** the deployed functions
3. You can **delete the downloaded files** from your computer
4. You **never need to deploy again**!

---

## 🎯 **Option 2: Use GitHub + GitHub Codespaces**

If you have a GitHub account, you can use their free cloud environment:

### **Steps:**

1. **Export project** from Figma Make
2. **Create GitHub repository** and upload files
3. **Open in Codespaces** (free online VS Code)
4. **Use terminal** in Codespaces to run deployment commands
5. Functions deploy to Supabase
6. Done!

**Detailed Steps:**

1. Go to https://github.com/new
2. Create a new repository (public or private)
3. Upload your Figma Make files
4. Click **Code** → **Codespaces** → **Create codespace**
5. Wait for environment to load
6. Terminal opens automatically
7. Run deployment commands (same as Option 1, Step 5)

---

## 🎯 **Option 3: Use Supabase Dashboard (Partial)**

You can do **most** setup via dashboard, but **not Edge Functions**:

### **What You Can Do:**

**✅ Create Database Tables:**
1. Go to https://supabase.com/dashboard
2. Open your project
3. Click **SQL Editor** → **New Query**
4. Copy this SQL (from your Figma Make files):

```sql
-- Go to your Figma Make project files
-- Find: /supabase/migrations/20241112000001_email_tables.sql
-- Copy the entire SQL content
-- Paste here and click "Run"
```

**✅ Set API Key:**
1. Click **Settings** → **Secrets**
2. Click **+ New Secret**
3. Name: `NYLAS_API_KEY`
4. Value: `nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv`
5. Click **Add Secret**

**❌ Edge Functions:**
- **Cannot** be deployed via dashboard
- **Must** use CLI (Option 1 or 2)

---

## 📧 **After Deployment: Connect Your Email**

Once functions are deployed (any option):

### **Step 1: Get App Password**

**Gmail:**
1. https://myaccount.google.com/apppasswords
2. Generate password → Copy

**Outlook:**
1. Use regular password

**Yahoo:**
1. https://login.yahoo.com/account/security
2. Generate app password → Copy

---

### **Step 2: Connect in Figma Make App**

1. **Open your Figma Make app** in browser
2. Click **Email** (left sidebar)
3. Click **"Add Account"**
4. Select **"IMAP/SMTP (Recommended)"**
5. Click **"Configure"**
6. Fill in:

**For Gmail:**
```
IMAP Server:  imap.gmail.com
Port:         993
Username:     yourname@gmail.com
Password:     [paste 16-char app password - NO SPACES]
```

**For Outlook:**
```
IMAP Server:  outlook.office365.com
Port:         993
Username:     yourname@outlook.com
Password:     [your account password]
```

**For Yahoo:**
```
IMAP Server:  imap.mail.yahoo.com
Port:         993
Username:     yourname@yahoo.com
Password:     [paste app password]
```

7. Click **"Connect Account"**
8. ✅ **Connected!**

---

### **Step 3: Test It**

1. Click **"Sync"** → Emails load
2. Click **"Compose"** → Send test email
3. ✅ **Working!**

---

## ✅ **Verification Checklist**

- [ ] **Exported project from Figma Make**
- [ ] **Installed Node.js** (if needed)
- [ ] **Installed Supabase CLI**
- [ ] **Logged in to Supabase**
- [ ] **Linked project**
- [ ] **Pushed database tables**
- [ ] **Set API key secret**
- [ ] **Deployed all 4 functions**
- [ ] **Verified with** `supabase functions list`
- [ ] **Got email app password**
- [ ] **Connected in Figma Make app**
- [ ] **Tested sync and send**

---

## 🆘 **Troubleshooting**

### **"I can't export from Figma Make"**

**Try:**
- Look for Download, Export, or Share buttons
- Right-click on project → Export
- Check Figma Make docs for export instructions

**Alternative:**
- Use Option 2 (GitHub Codespaces)
- Manual file copy if possible

---

### **"I don't have a computer to deploy from"**

**Solutions:**
- Use **Option 2** (GitHub Codespaces - free, cloud-based)
- Use **Replit** (free online IDE with terminal)
- Ask a friend/colleague to deploy once for you

---

### **"Node.js installation failed"**

**Try:**
- Download from: https://nodejs.org/
- Choose LTS (Long Term Support) version
- Run installer as Administrator
- Restart computer
- Try again

---

### **"Database password incorrect"**

**Get correct password:**
1. https://supabase.com/dashboard
2. Settings → Database
3. Click "Reset Password"
4. Copy new password
5. Try again

---

### **"Functions won't deploy"**

**Check:**
```cmd
# Verify CLI installed
supabase --version

# Verify logged in
supabase projects list

# Verify linked
supabase status

# Try deploying again
supabase functions deploy nylas-connect --debug
```

**If still failing:**
- Check you're in correct folder
- Check internet connection
- Check Supabase service status

---

## 📋 **Quick Command Reference**

**One-time setup:**
```cmd
npm install -g supabase
supabase login
supabase link --project-ref usorqldwroecyxucmtuw
```

**Deploy everything:**
```cmd
supabase db push
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
```

**Verify:**
```cmd
supabase functions list
```

---

## 🎉 **After Successful Deployment**

Once deployed:

✅ Functions are on Supabase **forever**  
✅ Your Figma Make app **automatically uses them**  
✅ No need to deploy again  
✅ Can delete downloaded files  
✅ Works from any device  
✅ Live email in your Figma Make app!  

---

## 🎯 **Recommended Path for Figma Make Users**

**Best option:**
1. ✅ Export project from Figma Make
2. ✅ Deploy from your computer (Option 1)
3. ✅ Takes 15 minutes
4. ✅ Done forever!

**Alternative (no computer access):**
1. ✅ Use GitHub Codespaces (Option 2)
2. ✅ Free cloud terminal
3. ✅ Takes 20 minutes
4. ✅ Done forever!

---

## 📞 **Need Help?**

**Stuck on export?**
- Screenshot where you're stuck in Figma Make
- I'll guide you through

**Stuck on deployment?**
- Tell me which error you're seeing
- Copy/paste the exact error message
- I'll help troubleshoot

**Stuck on email connection?**
- Check `CONNECT_YOUR_EMAIL.md`
- Common issue: Using regular password instead of app password

---

**Ready to start? Begin with Option 1 (export & deploy)!** 🚀
