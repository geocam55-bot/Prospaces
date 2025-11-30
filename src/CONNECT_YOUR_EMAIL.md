# 📧 Connect Your Email to ProSpaces CRM

## ✅ Backend is Deployed! Now Connect Your Email

### **Step 1: Get Your App Password**

Choose your email provider below:

---

## 🔴 **GMAIL USERS** (Most Common)

### **Get Gmail App Password:**

1. **Go to:** https://myaccount.google.com/apppasswords

2. **If you don't see "App passwords":**
   - First enable 2-Step Verification
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification" → Turn ON
   - Then go back to step 1

3. **Create App Password:**
   - Click "Select app" → Choose **"Mail"**
   - Click "Select device" → Choose **"Other (Custom name)"**
   - Type: **"ProSpaces CRM"**
   - Click **"Generate"**

4. **Copy the password** (16 characters, looks like: `abcd efgh ijkl mnop`)
   - Remove spaces when you paste it
   - Save it somewhere safe!

### **Your Gmail Settings:**
```
IMAP Server:  imap.gmail.com
Port:         993
Username:     your-email@gmail.com
Password:     [paste the 16-char app password]
```

---

## 🔵 **OUTLOOK USERS** (Outlook.com / Office 365)

### **Personal Outlook.com Accounts:**

You can usually use your **regular password** (no app password needed).

### **Your Outlook Settings:**
```
IMAP Server:  outlook.office365.com
Port:         993
Username:     your-email@outlook.com
Password:     [your regular account password]
```

### **Business/Office 365 Accounts with 2FA:**

If your organization requires 2FA, you may need an app password. Contact your IT admin.

---

## 🟣 **YAHOO USERS**

### **Get Yahoo App Password:**

1. **Go to:** https://login.yahoo.com/account/security

2. **Scroll down** to "Generate app password"

3. **Click "Generate password"**

4. **Select** "Other App"

5. **Type:** "ProSpaces CRM"

6. **Click "Generate"**

7. **Copy the password** and save it!

### **Your Yahoo Settings:**
```
IMAP Server:  imap.mail.yahoo.com
Port:         993
Username:     your-email@yahoo.com
Password:     [paste the app password]
```

---

## ⚫ **APPLE iCLOUD USERS**

### **Get iCloud App Password:**

1. **Go to:** https://appleid.apple.com/

2. **Sign in** with your Apple ID

3. **Go to "Security"** section

4. **Under "App-Specific Passwords"**, click **"Generate Password"**

5. **Enter label:** "ProSpaces CRM"

6. **Click "Create"**

7. **Copy the password**

### **Your iCloud Settings:**
```
IMAP Server:  imap.mail.me.com
Port:         993
Username:     your-email@icloud.com
Password:     [paste the app password]
```

---

## 🟤 **OTHER PROVIDERS** (Custom Domain, Hosting)

Contact your email provider or check their documentation for:
- IMAP server address
- IMAP port (usually 993)
- Your email address
- Your password

Common providers:
- **cPanel/WHM:** Check Email Accounts → Configure Mail Client
- **GoDaddy:** Email & Office → Manage → Email Setup
- **Namecheap:** Email → Manage → Mail Settings

---

## 📱 **Step 2: Connect in ProSpaces CRM**

Now that you have your app password:

1. **Open ProSpaces CRM** in your browser

2. **Click "Email"** in the left sidebar

3. **Click "Add Account"** button (top right)

4. **Select "IMAP/SMTP (Recommended)"** tab

5. **Click "Configure"**

6. **Fill in the form:**

   For **Gmail** users:
   ```
   IMAP Server:  imap.gmail.com
   Port:         993
   Security:     SSL/TLS (already selected)
   Username:     yourname@gmail.com
   Password:     [paste your 16-char app password - NO SPACES]
   ```

   For **Outlook** users:
   ```
   IMAP Server:  outlook.office365.com
   Port:         993
   Security:     SSL/TLS (already selected)
   Username:     yourname@outlook.com
   Password:     [your account password]
   ```

   For **Yahoo** users:
   ```
   IMAP Server:  imap.mail.yahoo.com
   Port:         993
   Security:     SSL/TLS (already selected)
   Username:     yourname@yahoo.com
   Password:     [your app password]
   ```

7. **Click "Connect Account"**

8. **Wait a few seconds...**

9. **✅ Success!** You should see "Account Connected!"

---

## 🧪 **Step 3: Test Your Connection**

### **Test 1: Sync Emails**

1. In ProSpaces CRM Email module
2. Click the **"Sync"** button (top of page)
3. Wait a few seconds
4. **✅ Your recent emails should appear!**

### **Test 2: Send Email**

1. Click **"Compose"** button
2. Send an email to yourself
3. Check if it arrives in your email inbox
4. **✅ If it arrives, sending works!**

### **Test 3: Link to Contact**

1. Open any email
2. Click **"Link to Contact"**
3. Select a contact
4. **✅ Email is now linked!**

---

## ❌ **Troubleshooting**

### **"Authentication failed"**

**Gmail users:**
- ✅ Make sure you created an **app password** (not your regular password)
- ✅ Remove spaces from the password (should be 16 characters, no spaces)
- ✅ Check 2-Step Verification is enabled
- ✅ Make sure IMAP is enabled:
  - Gmail Settings → Forwarding and POP/IMAP → Enable IMAP

**Outlook users:**
- ✅ Try your regular account password first
- ✅ Check username is your full email address

**Yahoo users:**
- ✅ Must use app password (regular password won't work)

---

### **"Failed to connect IMAP"**

**Check:**
- ✅ IMAP server address is correct (no typos)
- ✅ Port is **993**
- ✅ Username is your **full email address**
- ✅ Password is correct (app password for Gmail/Yahoo)

---

### **"Backend not deployed"**

**Solution:**
- You skipped the deployment steps
- Go back and run all commands in Step 1-9 above
- Verify with: `supabase functions list`

---

### **"IMAP not enabled"**

**Gmail:**
1. Go to Gmail settings (gear icon)
2. Click "See all settings"
3. Go to "Forwarding and POP/IMAP" tab
4. Select "Enable IMAP"
5. Click "Save Changes"
6. Try connecting again

---

### **Still Not Working?**

**Check the logs:**

```cmd
supabase functions logs nylas-connect --tail
```

Then try connecting again and watch for errors in the log.

---

## ✅ **Success Checklist**

- [ ] App password created
- [ ] IMAP enabled in email provider
- [ ] Account connected in ProSpaces CRM
- [ ] Emails syncing successfully
- [ ] Can send test email
- [ ] Can link emails to contacts

---

## 🎉 **You're Done!**

Now you can:
- ✅ View all emails in ProSpaces CRM
- ✅ Send emails from the CRM
- ✅ Reply to emails
- ✅ Forward emails
- ✅ Link emails to contacts, bids, tasks
- ✅ Search and filter emails
- ✅ Track all conversations
- ✅ Use email templates

---

**Need help?** Check the troubleshooting section above or let me know which error you're seeing!
