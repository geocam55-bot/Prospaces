# 📧 IMAP/SMTP Setup Guide for ProSpaces CRM

## ✅ You Chose: IMAP/SMTP (Smart Choice!)

IMAP/SMTP is the **recommended method** because:
- ✅ Works with **any** email provider (Gmail, Outlook, Yahoo, custom domains)
- ✅ No OAuth setup complexity
- ✅ Full control over your email
- ✅ More reliable and direct connection

---

## 🚀 Quick Setup (3 Steps)

### **Step 1: Deploy Backend Functions**

IMAP/SMTP still requires the backend to be deployed for security. Follow these commands:

```bash
# Open Command Prompt (Windows Key + R, type "cmd")
cd C:\Path\To\Your\ProSpacesCRM

# Install CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref usorqldwroecyxucmtuw

# Deploy
supabase db push
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
```

---

### **Step 2: Get Your Email Provider Settings**

Choose your email provider below:

---

## 📧 Provider-Specific Settings

### **Gmail (Google)**

**IMAP Settings:**
- **Host:** `imap.gmail.com`
- **Port:** `993`
- **Username:** Your full Gmail address (e.g., `yourname@gmail.com`)
- **Password:** App-specific password (see below)

**⚠️ IMPORTANT: Gmail App Password Required**

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in to your Google account
3. Click "Select app" → Choose "Mail"
4. Click "Select device" → Choose "Other (Custom name)"
5. Type "ProSpaces CRM"
6. Click **Generate**
7. Copy the 16-character password (no spaces)
8. Use this password in ProSpaces CRM

**Note:** If you don't see "App passwords" option:
- Make sure 2-Step Verification is enabled
- Go to Google Account → Security → 2-Step Verification → Turn it ON
- Then try again

---

### **Microsoft Outlook / Office 365**

**IMAP Settings:**
- **Host:** `outlook.office365.com`
- **Port:** `993`
- **Username:** Your full email address (e.g., `yourname@outlook.com`)
- **Password:** Your account password or app password

**For Personal Outlook.com accounts:**
- Host: `outlook.office365.com`
- Port: `993`
- Username: `yourname@outlook.com`
- Password: Regular password works

**For Office 365 / Business accounts:**
- Host: `outlook.office365.com`
- Port: `993`
- Username: `yourname@company.com`
- Password: May need app-specific password if 2FA is enabled

---

### **Yahoo Mail**

**IMAP Settings:**
- **Host:** `imap.mail.yahoo.com`
- **Port:** `993`
- **Username:** Your Yahoo email address
- **Password:** App-specific password (see below)

**Generate Yahoo App Password:**

1. Go to: https://login.yahoo.com/account/security
2. Sign in to your Yahoo account
3. Scroll to "Generate app password"
4. Click "Generate password"
5. Select "Other App"
6. Type "ProSpaces CRM"
7. Click **Generate**
8. Copy the password
9. Use this password in ProSpaces CRM

---

### **Apple iCloud Mail**

**IMAP Settings:**
- **Host:** `imap.mail.me.com`
- **Port:** `993`
- **Username:** Your full iCloud email (e.g., `yourname@icloud.com`)
- **Password:** App-specific password

**Generate iCloud App Password:**

1. Go to: https://appleid.apple.com/
2. Sign in with your Apple ID
3. Go to "Security" section
4. Under "App-Specific Passwords", click "Generate Password"
5. Enter "ProSpaces CRM" as the label
6. Copy the password
7. Use this password in ProSpaces CRM

---

### **Custom Domain / Other Providers**

**Contact your email provider or hosting company for:**
- IMAP server address (e.g., `mail.yourdomain.com`)
- IMAP port (usually `993` for SSL)
- Your email address
- Your password

**Common Hosting Providers:**
- **cPanel/WHM:** Check Email Accounts → Configure Mail Client
- **GoDaddy:** Email & Office → Manage → Email Setup
- **Namecheap:** Email → Manage → Mail Settings
- **Bluehost:** Email → Connect Devices

---

## 🔐 Step 3: Connect in ProSpaces CRM

Once backend is deployed:

1. **Open ProSpaces CRM** in your browser
2. Go to **Email** module (left sidebar)
3. Click **"Add Account"** button
4. Select **"IMAP/SMTP (Recommended)"** tab
5. Click **"Configure"**
6. Fill in the form:
   - **IMAP Server:** Enter from settings above (e.g., `imap.gmail.com`)
   - **Port:** Enter port number (usually `993`)
   - **Security:** SSL/TLS (already selected)
   - **Username/Email:** Your full email address
   - **Password:** Your app-specific password or account password
7. Click **"Connect Account"**
8. ✅ Done! Your email is now connected

---

## 🧪 Testing Your Connection

After connecting:

1. **Click "Sync"** in the email module
2. Wait a few seconds
3. Your inbox should populate with recent emails
4. **Try sending a test email:**
   - Click "Compose"
   - Send to yourself
   - Check if it arrives

---

## ❓ Troubleshooting

### "Failed to connect IMAP"

**Check:**
- [ ] IMAP server address is correct (no typos)
- [ ] Port is `993` for most providers
- [ ] Username is your **full email address**
- [ ] Password is **app-specific password**, not regular password
- [ ] IMAP is enabled in your email provider settings

---

### "Authentication failed"

**For Gmail:**
- [ ] Did you create an app-specific password?
- [ ] Did you copy it correctly (no spaces)?
- [ ] Is 2-Step Verification enabled?
- [ ] Is IMAP enabled? (Gmail Settings → Forwarding and POP/IMAP → Enable IMAP)

**For Outlook:**
- [ ] Try your regular password first
- [ ] If that fails, create an app password

**For Yahoo:**
- [ ] Must use app-specific password
- [ ] Regular password won't work

---

### "Backend not deployed"

If you see this error:

**You need to deploy first!** Run these commands:

```bash
# Quick deployment
cd C:\Path\To\Your\Project
npm install -g supabase
supabase login
supabase link --project-ref usorqldwroecyxucmtuw
supabase db push
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv
supabase functions deploy nylas-connect
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
```

Then try connecting again.

---

### "IMAP not enabled"

**Gmail:**
1. Go to Gmail settings (gear icon)
2. Click "See all settings"
3. Go to "Forwarding and POP/IMAP" tab
4. Under "IMAP Access", select "Enable IMAP"
5. Click "Save Changes"

**Outlook/Yahoo:**
- IMAP is usually enabled by default
- Check your email provider's settings

---

## 🔐 Security Best Practices

✅ **DO:**
- Use app-specific passwords (not your main password)
- Enable 2-Factor Authentication on your email account
- Keep your CRM password different from email password
- Regularly rotate app-specific passwords

❌ **DON'T:**
- Share your app-specific passwords
- Use the same password for everything
- Disable 2FA to avoid app passwords (bad idea!)
- Store passwords in plain text files

---

## 📊 What Happens After Connection

Once your IMAP email is connected:

✅ **You can:**
- View all emails from your inbox in the CRM
- Send emails directly from ProSpaces
- Reply to emails
- Forward emails
- Search all email conversations
- Link emails to contacts, bids, and tasks
- Mark emails as read/unread, starred
- Organize emails by folder
- Track email history with clients

✅ **Emails are synced:**
- Manually when you click "Sync"
- Automatically (coming soon)
- Bidirectionally (changes in CRM reflect in email provider)

---

## 🎯 Next Steps After Setup

1. ✅ **Test send/receive** - Send yourself an email
2. ✅ **Sync your inbox** - Click "Sync" to pull recent emails
3. ✅ **Link to contacts** - Open an email and link it to a contact
4. ✅ **Create templates** - Set up email templates for common replies
5. ✅ **Configure signatures** - Add your email signature
6. ✅ **Set up filters** - Organize emails automatically

---

## 🆘 Still Having Issues?

**If you're stuck:**

1. **Check backend is deployed:**
   ```bash
   supabase functions list
   ```
   Should show all 4 functions.

2. **Check logs:**
   ```bash
   supabase functions logs nylas-connect --tail
   ```
   Then try connecting and watch for errors.

3. **Verify credentials:**
   - Try logging into your email provider directly
   - Make sure your app password works

4. **Try Demo Mode first:**
   - ProSpaces CRM → Email → Add Account → "Try Demo Mode"
   - This tests the UI without needing real email

---

## ✅ Success Checklist

- [ ] Backend functions deployed
- [ ] App-specific password created
- [ ] IMAP enabled in email provider
- [ ] Correct server settings entered
- [ ] Account connected successfully
- [ ] Emails syncing properly
- [ ] Can send test email
- [ ] Emails linked to contacts

---

## 📞 Quick Reference Card

**Gmail:**
```
Host: imap.gmail.com
Port: 993
User: yourname@gmail.com
Pass: 16-char app password
```

**Outlook:**
```
Host: outlook.office365.com
Port: 993
User: yourname@outlook.com
Pass: account password
```

**Yahoo:**
```
Host: imap.mail.yahoo.com
Port: 993
User: yourname@yahoo.com
Pass: app-specific password
```

---

**Ready to connect? Deploy the backend first, then follow Step 3!** 🚀
