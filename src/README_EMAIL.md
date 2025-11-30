# 📧 ProSpaces CRM - IMAP/SMTP Email Integration

## 🎯 What You're Setting Up

**Live IMAP/SMTP email integration** that allows you to:
- Send & receive real emails from ProSpaces CRM
- Connect Gmail, Outlook, Yahoo, or any IMAP email provider
- Link emails to contacts, bids, and tasks
- Track all email conversations in one place
- Use email templates for quick replies

---

## 🚀 Quick Start Guide

### **Choose Your Path:**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  PATH 1: DEPLOY BACKEND → LIVE IMAP/SMTP EMAIL        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Time: 10-15 minutes                                    │
│  Result: Real email integration                         │
│                                                         │
│  📖 Read: IMAP_QUICK_START.txt (1 page)                │
│  📖 Or: IMAP_SMTP_SETUP_GUIDE.md (detailed)            │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                                                         │
│  PATH 2: DEMO MODE → TEST EMAIL UI                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Time: 2 seconds                                        │
│  Result: Sample data for testing                        │
│                                                         │
│  🎮 ProSpaces CRM → Email → "Try Demo Mode"            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 3-Step Process for Live Email

### **Step 1: Deploy Backend** (10 minutes, one-time)

Open Command Prompt and run:

```bash
cd C:\Path\To\Your\ProSpacesCRM
npm install -g supabase
supabase login
supabase link --project-ref usorqldwroecyxucmtuw
supabase db push
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv
supabase functions deploy nylas-connect
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
```

---

### **Step 2: Get App Password** (5 minutes)

**Gmail Users:**
1. Go to: https://myaccount.google.com/apppasswords
2. Generate password → Copy it
3. Settings: `imap.gmail.com:993`

**Outlook Users:**
1. Use your regular password
2. Settings: `outlook.office365.com:993`

**Yahoo Users:**
1. Go to: https://login.yahoo.com/account/security
2. Generate app password → Copy it
3. Settings: `imap.mail.yahoo.com:993`

---

### **Step 3: Connect in CRM** (2 minutes)

1. Open ProSpaces CRM
2. Email module → "Add Account"
3. Choose "IMAP/SMTP (Recommended)"
4. Enter your settings
5. Click "Connect"
6. ✅ Done!

---

## 📖 Documentation Files

```
┌─────────────────────────────────────────────────────────────┐
│  📄 FILE                          │  📝 DESCRIPTION          │
├─────────────────────────────────────────────────────────────┤
│  ⭐ START_HERE.md                │  Overview & next steps   │
│  ⭐ IMAP_QUICK_START.txt         │  1-page quick reference  │
│  ⭐ IMAP_SMTP_SETUP_GUIDE.md     │  Complete IMAP guide     │
│  📋 WINDOWS_DEPLOYMENT.md        │  Windows step-by-step    │
│  📋 QUICK_DEPLOY.txt             │  Command cheatsheet      │
│  📋 DEPLOY_COMMANDS.md           │  Command reference       │
│  📋 DEPLOYMENT_STATUS.md         │  Progress tracker        │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ What's Created

### **Backend Files:**
- ✅ `/supabase/functions/nylas-connect/` - Email connection handler
- ✅ `/supabase/functions/nylas-send-email/` - Send email handler
- ✅ `/supabase/functions/nylas-sync-emails/` - Email sync handler
- ✅ `/supabase/migrations/20241112000001_email_tables.sql` - Database tables

### **Features Enabled:**
- ✅ IMAP/SMTP email connections
- ✅ Send emails from CRM
- ✅ Sync inbox messages
- ✅ Link emails to contacts/bids
- ✅ Email search & filtering
- ✅ Email templates
- ✅ Conversation tracking

---

## 🔧 Supported Email Providers

| Provider | IMAP Host | Port | Auth Method |
|----------|-----------|------|-------------|
| **Gmail** | imap.gmail.com | 993 | App Password |
| **Outlook** | outlook.office365.com | 993 | Regular Password |
| **Yahoo** | imap.mail.yahoo.com | 993 | App Password |
| **iCloud** | imap.mail.me.com | 993 | App Password |
| **Custom** | Your IMAP host | 993 | Provider-specific |

---

## ⚠️ Prerequisites

Before deploying, make sure you have:

- [ ] **Node.js** installed → https://nodejs.org/
- [ ] **Project files** on your computer
- [ ] **Supabase account** (already set up ✅)
- [ ] **Email account** to connect
- [ ] **15 minutes** of time

---

## 🎯 After Deployment

Once everything is deployed and connected:

### **In ProSpaces CRM, you can:**

✅ **View emails** from your inbox  
✅ **Send emails** to contacts  
✅ **Reply to emails** in-thread  
✅ **Forward emails** to others  
✅ **Search emails** by keyword, sender, date  
✅ **Filter by folder** (Inbox, Sent, Drafts, etc.)  
✅ **Mark as read/unread** or star important emails  
✅ **Link emails** to contacts, bids, tasks  
✅ **Track conversations** with each client  
✅ **Use templates** for common replies  

---

## 🆘 Need Help?

### **If you get stuck:**

1. **Read the guide:** `IMAP_QUICK_START.txt` has everything on 1 page
2. **Check logs:** `supabase functions logs nylas-connect --tail`
3. **Common issues:**
   - "Backend not deployed" → Run deployment commands
   - "Authentication failed" → Check you're using app password
   - "IMAP not enabled" → Enable IMAP in email provider settings

### **Quick Troubleshooting:**

```bash
# Check if functions are deployed
supabase functions list

# View real-time logs
supabase functions logs nylas-connect --tail

# Re-deploy if needed
supabase functions deploy nylas-connect
```

---

## 🎉 Success!

Once you see emails loading in ProSpaces CRM:

1. ✅ **Test sending** - Compose and send a test email
2. ✅ **Test syncing** - Click "Sync" to fetch new emails
3. ✅ **Test linking** - Link an email to a contact
4. ✅ **Explore features** - Try templates, search, filters

---

## 📞 Support

**Documentation:**
- Read `IMAP_SMTP_SETUP_GUIDE.md` for detailed instructions
- Check `TROUBLESHOOTING.md` for common issues
- See `WINDOWS_DEPLOYMENT.md` for Windows-specific help

**Logs:**
```bash
supabase functions logs nylas-connect --tail
supabase functions logs nylas-send-email --tail
supabase functions logs nylas-sync-emails --tail
```

---

## 🚀 Ready?

**Pick a path:**

→ **Deploy now:** Open `IMAP_QUICK_START.txt` and follow steps  
→ **Test first:** ProSpaces CRM → Email → "Try Demo Mode"  
→ **Learn more:** Read `IMAP_SMTP_SETUP_GUIDE.md`  

---

**Let's get your email integration live!** 🎯
