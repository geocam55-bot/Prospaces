# 🪟 Windows Deployment Guide for ProSpaces CRM Email

## ✅ Files Created

All Edge Function files have been created:

```
✅ /supabase/functions/nylas-connect/index.ts
✅ /supabase/functions/nylas-callback/index.ts
✅ /supabase/functions/nylas-send-email/index.ts
✅ /supabase/functions/nylas-sync-emails/index.ts
✅ /supabase/migrations/20241112000001_email_tables.sql
```

---

## 📋 Prerequisites

Before you start, make sure you have:

1. ✅ **Node.js installed** (Download from: https://nodejs.org/)
2. ✅ **Your project files downloaded** to your computer
3. ✅ **Supabase account** with project created

---

## 🚀 Step-by-Step Deployment (Windows)

### **Step 1: Open Command Prompt**

1. Press `Windows Key + R`
2. Type `cmd` and press Enter
3. A black window will open (Command Prompt)

---

### **Step 2: Navigate to Your Project**

In the Command Prompt, type:

```cmd
cd C:\Users\YourUsername\Documents\ProSpacesCRM
```

**Replace with your actual project path!**

To find your project path:
- Open File Explorer
- Find your project folder
- Click the address bar at the top
- Copy the path
- Paste it after `cd `

---

### **Step 3: Install Supabase CLI**

Copy and paste this command:

```cmd
npm install -g supabase
```

Wait for it to finish (may take 1-2 minutes).

---

### **Step 4: Login to Supabase**

```cmd
supabase login
```

This will open your browser. Click "Authorize" to log in.

---

### **Step 5: Link Your Project**

```cmd
supabase link --project-ref usorqldwroecyxucmtuw
```

**When prompted for database password:**
- Go to your Supabase dashboard
- Click on your project
- Go to Settings → Database
- Copy the password
- Paste it in the terminal (it won't show as you type - this is normal)
- Press Enter

---

### **Step 6: Push Database Migration**

This creates the email tables:

```cmd
supabase db push
```

Wait for confirmation: "Finished supabase db push."

---

### **Step 7: Set API Key Secret**

```cmd
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv
```

Wait for: "Finished supabase secrets set."

---

### **Step 8: Deploy Edge Functions**

Copy and paste these **ONE AT A TIME**:

```cmd
supabase functions deploy nylas-connect
```

Wait for: ✓ Deployed Function nylas-connect

```cmd
supabase functions deploy nylas-callback
```

Wait for: ✓ Deployed Function nylas-callback

```cmd
supabase functions deploy nylas-send-email
```

Wait for: ✓ Deployed Function nylas-send-email

```cmd
supabase functions deploy nylas-sync-emails
```

Wait for: ✓ Deployed Function nylas-sync-emails

---

### **Step 9: Verify Deployment**

```cmd
supabase functions list
```

You should see:

```
✅ nylas-connect
✅ nylas-callback
✅ nylas-send-email
✅ nylas-sync-emails
```

---

## 🎉 Success! Now Test It

1. Open your **ProSpaces CRM** in the browser
2. Go to **Email** module
3. Click **"Add Account"**
4. Choose **IMAP/SMTP** or **OAuth**
5. Follow the connection steps
6. ✅ Your email should connect!

---

## ❓ Troubleshooting

### "node is not recognized"
**Solution:** Install Node.js from https://nodejs.org/

### "supabase is not recognized"
**Solution:** 
```cmd
npm install -g supabase
```

### "Cannot find module"
**Solution:** Make sure you're in the correct project folder with `cd`

### "Project not linked"
**Solution:** Run the link command again:
```cmd
supabase link --project-ref usorqldwroecyxucmtuw
```

### Functions deploy fails
**Solution:** Check you're logged in:
```cmd
supabase login
```

### Need to see logs
```cmd
supabase functions logs nylas-connect --tail
```

---

## 📝 All Commands in One Block

**Copy this entire block for quick deployment:**

```cmd
cd C:\Path\To\Your\ProSpacesCRM
npm install -g supabase
supabase login
supabase link --project-ref usorqldwroecyxucmtuw
supabase db push
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
supabase functions list
```

**Remember:** Change the first line to your actual project path!

---

## 🎯 Next Steps After Deployment

1. ✅ Connect your Gmail or IMAP account
2. ✅ Send a test email
3. ✅ Sync your inbox
4. ✅ Link emails to contacts/bids

---

## 🔐 Security Notes

- ✅ API keys are stored securely in Supabase secrets
- ✅ All data is encrypted in transit
- ✅ Row-level security protects your emails
- ⚠️ In production, consider encrypting stored credentials

---

**Need help? Let me know which step you're on and what error you're seeing!** 🚀
