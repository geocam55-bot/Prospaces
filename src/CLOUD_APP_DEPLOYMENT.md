# 🌐 Deploy IMAP/SMTP Email for Cloud-Hosted Apps

## ✅ Your App is in the Cloud - Here's What to Do

Since ProSpaces CRM is running in the cloud (not on your computer), here are **3 easy deployment options**:

---

## 🎯 **Option 1: Use Your Cloud Platform's Terminal** ⭐ **EASIEST**

Most cloud platforms have a built-in terminal/console!

### **Step 1: Find Your Terminal**

**Which platform are you using?**

- **Replit** → Click "Shell" tab at bottom
- **StackBlitz** → Click Terminal icon (>_) at bottom
- **CodeSandbox** → Click "Terminal" tab at bottom
- **GitHub Codespaces** → Terminal menu → New Terminal
- **Gitpod** → Terminal at bottom (usually open by default)
- **Glitch** → Tools → Terminal

**📖 Can't find it?** Check `CLOUD_TERMINAL_ACCESS.md` for detailed instructions!

---

### **Step 2: Run These Commands in Your Cloud Terminal**

Once terminal is open, copy/paste these **ONE AT A TIME**:

```bash
# Install Supabase CLI
npm install -g supabase
```
*Press Enter, wait 1-2 minutes*

```bash
# Login to Supabase
supabase login
```
*Press Enter, browser opens → Click "Authorize"*

```bash
# Link your project
supabase link --project-ref usorqldwroecyxucmtuw
```
*Enter database password when asked (get it from Supabase Dashboard → Settings → Database)*

```bash
# Create database tables
supabase db push
```
*Wait for "Finished supabase db push"*

```bash
# Set API key
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv
```
*Wait for "Finished supabase secrets set"*

```bash
# Deploy Edge Functions (one at a time)
supabase functions deploy nylas-connect
```
*Wait for ✓ Deployed*

```bash
supabase functions deploy nylas-callback
```
*Wait for ✓ Deployed*

```bash
supabase functions deploy nylas-send-email
```
*Wait for ✓ Deployed*

```bash
supabase functions deploy nylas-sync-emails
```
*Wait for ✓ Deployed*

```bash
# Verify deployment
supabase functions list
```
*Should show all 4 functions!*

---

### **Step 3: Connect Your Email in ProSpaces CRM**

1. **Get app password** from Gmail/Outlook/Yahoo (see below)
2. **Open ProSpaces CRM** (your cloud URL)
3. **Click Email** → Add Account → IMAP/SMTP
4. **Enter settings** and connect
5. **✅ Done!**

---

## 🎯 **Option 2: Use Supabase Dashboard (Partial)**

If you can't access terminal, use the dashboard for some steps:

### **What You Can Do via Dashboard:**

**✅ Create Database Tables:**
1. Go to https://supabase.com/dashboard
2. Open your project
3. Click **SQL Editor** → New Query
4. Copy SQL from `/supabase/migrations/20241112000001_email_tables.sql`
5. Paste and run
6. ✅ Tables created!

**✅ Set API Key:**
1. Click **Settings** → **Secrets**
2. Add new secret:
   - Name: `NYLAS_API_KEY`
   - Value: `nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv`
3. ✅ Secret set!

**❌ Edge Functions:**
- Unfortunately, functions **must** be deployed via CLI
- You'll still need terminal access (Option 1 or 3)

---

## 🎯 **Option 3: Deploy from Local Computer (One-Time)**

Even if your app runs in the cloud, you can deploy from your computer once:

### **Why This Works:**
- Edge Functions deploy to Supabase (not your computer)
- Once deployed, they stay there forever
- Your cloud app uses them automatically
- You never need to deploy again!

### **Steps:**

**1. Download Project Files:**
- From your cloud platform, download/export the project
- Or clone from GitHub if connected

**2. On Your Computer:**
Open Command Prompt (Windows Key + R → type "cmd")

```cmd
cd C:\Path\To\Downloaded\Project
npm install -g supabase
supabase login
supabase link --project-ref usorqldwroecyxucmtuw
supabase db push
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
```

**3. Done!**
- Functions are now deployed to Supabase
- Your cloud app uses them
- You can delete the local files if you want
- No need to deploy again!

---

## 📧 **Connect Your Email (All Options)**

After deployment (any option above):

### **Gmail:**
1. Go to: https://myaccount.google.com/apppasswords
2. Generate app password → Copy it
3. In ProSpaces CRM:
   - IMAP Server: `imap.gmail.com`
   - Port: `993`
   - Username: `your-email@gmail.com`
   - Password: [paste app password]

### **Outlook:**
1. Use your regular password
2. In ProSpaces CRM:
   - IMAP Server: `outlook.office365.com`
   - Port: `993`
   - Username: `your-email@outlook.com`
   - Password: [your password]

### **Yahoo:**
1. Go to: https://login.yahoo.com/account/security
2. Generate app password → Copy it
3. In ProSpaces CRM:
   - IMAP Server: `imap.mail.yahoo.com`
   - Port: `993`
   - Username: `your-email@yahoo.com`
   - Password: [paste app password]

**Full instructions:** See `CONNECT_YOUR_EMAIL.md`

---

## ✅ **Verification Checklist**

After deployment, verify everything worked:

- [ ] **Database tables created**
  - Go to Supabase Dashboard → Database → Tables
  - Should see: `email_accounts` and `emails`

- [ ] **API key set**
  - Supabase Dashboard → Settings → Secrets
  - Should see: `NYLAS_API_KEY`

- [ ] **Functions deployed**
  - Supabase Dashboard → Edge Functions
  - Should see 4 functions

- [ ] **Email connected**
  - ProSpaces CRM → Email → Account shows "Connected"

- [ ] **Emails syncing**
  - Click "Sync" → Emails appear

- [ ] **Can send email**
  - Compose → Send test email → Arrives

---

## 🆘 **Troubleshooting**

### **"Can't find terminal in my cloud platform"**
→ Check `CLOUD_TERMINAL_ACCESS.md` for platform-specific instructions
→ Or use Option 3 (deploy from local computer)

### **"npm: command not found"**
→ Your cloud platform might not have Node.js
→ Use Option 3 (deploy from local computer)

### **"supabase: command not found"**
→ Run: `npm install -g supabase` first
→ Then try again

### **"Authentication failed" when connecting email**
→ Gmail/Yahoo: Use app password, not regular password
→ Check `CONNECT_YOUR_EMAIL.md` for instructions

### **"Backend not deployed" in ProSpaces CRM**
→ Run: `supabase functions list` to verify
→ Should show 4 functions
→ If not, run deploy commands again

---

## 🎯 **Recommended Path**

**For most cloud-hosted apps:**

1. ✅ Try **Option 1** (use cloud terminal) first
2. ✅ If no terminal, use **Option 3** (deploy from computer)
3. ✅ Get email app password
4. ✅ Connect in ProSpaces CRM
5. ✅ Test sync and send
6. ✅ Done!

**Total time:** 15-20 minutes

---

## 📞 **Need Help?**

**Tell me:**
1. Which cloud platform are you using?
   - Replit, StackBlitz, CodeSandbox, GitHub Codespaces, other?

2. Can you access a terminal?
   - Yes / No / Not sure

3. Or do you want to deploy from your computer?
   - Yes, I can download the project
   - No, prefer cloud-only solution

I'll give you exact instructions based on your setup! 🚀
