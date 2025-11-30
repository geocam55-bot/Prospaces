# 📧 ProSpaces CRM - Email Integration Setup

## 🎯 Current Status

✅ **Demo Mode** - Working (sample data for UI testing)  
⏳ **Live Email** - Ready to activate (choose Option 1 or 2 below)

---

## 🚀 Choose Your Setup Method

### ⚡ Option 1: IMAP/SMTP (Instant - Recommended to Start)

**Time:** 2 minutes  
**Deployment:** None required  
**Works for:** Any email provider (Gmail, Outlook, Yahoo, etc.)

**Steps:**
1. Open ProSpaces CRM → **Email** module
2. Click **"Add Account"**
3. Select **IMAP/SMTP** tab
4. Enter your settings (examples provided below)
5. Click **"Connect Account"**

**Gmail Example:**
- IMAP Server: `imap.gmail.com`
- Port: `993`
- Username: `your-email@gmail.com`
- Password: [Create App Password](https://myaccount.google.com/apppasswords)

**Outlook Example:**
- IMAP Server: `outlook.office365.com`
- Port: `993`
- Username: `your-email@outlook.com`
- Password: Your Outlook password

**✅ Pros:** Works immediately, no backend setup  
**⚠️ Note:** Credentials stored in browser localStorage only

---

### 🔐 Option 2: OAuth via Nylas (Production - Full Features)

**Time:** 10-15 minutes (one-time setup)  
**Deployment:** Required (automated scripts provided)  
**Works for:** Gmail, Outlook (OAuth flow)

#### Automated Deployment:

**Mac/Linux:**
```bash
chmod +x deploy-email.sh
./deploy-email.sh
```

**Windows PowerShell:**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\deploy-email.ps1
```

#### What You Need:
1. **Supabase CLI** - Installs automatically via script
2. **Nylas Account** - Free at [nylas.com](https://nylas.com)
3. **5-10 minutes** - For OAuth configuration

**✅ Pros:** Secure, multi-user, auto-sync, server-side storage  
**💡 Best for:** Production deployments with multiple users

---

## 📁 Files & Documentation

### Quick Start
- `EMAIL_ACTIVATION_QUICK_REF.md` - One-page reference card
- `ACTIVATE_LIVE_EMAIL.md` - Complete step-by-step guide
- `QUICK_START.md` - Original deployment guide

### Deployment Scripts
- `deploy-email.sh` - Automated deployment (Mac/Linux)
- `deploy-email.ps1` - Automated deployment (Windows)
- `test-email-setup.sh` - Verify your setup status

### Advanced Guides
- `OAUTH_SETUP_GUIDE.md` - Detailed OAuth configuration
- `DEPLOY_NYLAS_FUNCTIONS.md` - Manual deployment steps
- `NYLAS_SETUP_GUIDE.md` - Nylas platform setup

---

## 🧪 Test Your Setup

### Option 1: Run Test Script
```bash
chmod +x test-email-setup.sh
./test-email-setup.sh
```

### Option 2: Use Built-in Diagnostic
1. Open ProSpaces CRM
2. Go to **Settings** → **Developer** tab
3. Click **"Run Diagnostic Test"**
4. Should show: ✅ "Function is working"

---

## 🔍 Troubleshooting

### "Failed to fetch" Error
**Cause:** Edge Functions not deployed  
**Fix:** Use IMAP/SMTP (Option 1) or deploy functions (Option 2)

### "Nylas API key not configured"
**Cause:** Missing API key secret  
**Fix:** 
```bash
supabase secrets set NYLAS_API_KEY=your_actual_key_here
supabase functions deploy nylas-connect
```

### "supabase: command not found"
**Cause:** Supabase CLI not installed  
**Fix:** 
```bash
npm install -g supabase
```

### OAuth Popup Blocked
**Cause:** Browser blocking popups  
**Fix:** Allow popups for your domain in browser settings

### "Cannot connect to IMAP server"
**Cause:** Invalid credentials or server settings  
**Fix:** 
- Verify server address and port
- Use app-specific password (Gmail, Yahoo)
- Check 2FA settings

---

## 📊 What Each Option Gives You

| Feature | IMAP/SMTP | OAuth (Nylas) |
|---------|-----------|---------------|
| Setup Time | 2 minutes | 10-15 minutes |
| Deployment | None | Edge Functions |
| Gmail Support | ✅ | ✅ |
| Outlook Support | ✅ | ✅ |
| Other Providers | ✅ | Limited |
| Send Emails | ✅ | ✅ |
| Receive Emails | Manual sync | Auto-sync |
| Multi-user | ⚠️ Per browser | ✅ Server-side |
| Security | Local storage | Encrypted DB |
| Best For | Testing/Solo | Production |

---

## ✅ Post-Setup Checklist

After activating live email, you can:

- [ ] Connect your Gmail/Outlook account
- [ ] View inbox emails in the CRM
- [ ] Send emails from the CRM
- [ ] Link emails to contacts
- [ ] Link emails to bids/appointments
- [ ] Search and filter emails
- [ ] Mark emails as starred/read
- [ ] Compose new emails with templates
- [ ] Track email activity in Marketing analytics

---

## 🎯 Recommended Path

**New Users / Testing:**
1. Start with **Demo Mode** (already working)
2. Explore the email UI and features
3. When ready, set up **IMAP/SMTP** for real testing
4. For production: Deploy **OAuth via Nylas**

**Production / Multiple Users:**
1. Go straight to **OAuth via Nylas**
2. Run `./deploy-email.sh`
3. Configure Nylas OAuth
4. Test with diagnostic tool
5. Roll out to team

---

## 🆘 Getting Help

1. **Quick Reference:** Check `EMAIL_ACTIVATION_QUICK_REF.md`
2. **Full Guide:** Read `ACTIVATE_LIVE_EMAIL.md`
3. **Test Setup:** Run `./test-email-setup.sh`
4. **View Logs:** `supabase functions logs nylas-connect --tail`
5. **Browser Console:** Press F12 for detailed errors

---

## 🔗 Useful Links

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Nylas Documentation](https://developer.nylas.com/)
- [Gmail App Passwords](https://myaccount.google.com/apppasswords)
- [Outlook App Passwords](https://account.microsoft.com/security)

---

## 📝 Summary

You have **3 options** to activate live email:

1. **✨ Demo Mode** - Already working! Test the UI with sample data
2. **⚡ IMAP/SMTP** - 2 minutes, works instantly, perfect for testing
3. **🔐 OAuth (Nylas)** - 15 minutes, production-ready, full features

**Choose based on your needs:** Testing → IMAP/SMTP | Production → OAuth

**Ready to start?** Open `EMAIL_ACTIVATION_QUICK_REF.md` for quick commands!

---

*Last Updated: 2025-11-12*
