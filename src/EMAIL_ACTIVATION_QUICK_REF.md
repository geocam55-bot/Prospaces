# 📧 Email Activation - Quick Reference Card

## 🎯 Two Ways to Activate Live Email

### Option A: IMAP/SMTP (Instant - No Setup)
**Time: 2 minutes | No deployment needed**

1. Open ProSpaces CRM → **Email** module
2. Click **"Add Account"**
3. Select **IMAP/SMTP** tab
4. Enter your email settings:
   - Gmail: `imap.gmail.com:993` ([Get App Password](https://myaccount.google.com/apppasswords))
   - Outlook: `outlook.office365.com:993`
   - Yahoo: `imap.mail.yahoo.com:993`
5. Click **"Connect Account"**

✅ **Works immediately**  
⚠️ **Note:** Credentials stored in browser only

---

### Option B: OAuth via Nylas (Production Ready)
**Time: 10 minutes | One-time setup**

#### Quick Deploy (Automated):

**Mac/Linux:**
```bash
chmod +x deploy-email.sh
./deploy-email.sh
```

**Windows (PowerShell):**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\deploy-email.ps1
```

#### Manual Deploy (5 steps):

```bash
# 1. Install CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Link project
supabase link --project-ref usorqldwroecyxucmtuw

# 4. Set API key (get from nylas.com)
supabase secrets set NYLAS_API_KEY=your_key_here

# 5. Deploy functions
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
```

✅ **Secure server-side storage**  
✅ **Multi-user support**  
✅ **Auto email sync**

---

## 🧪 Test Deployment

1. Go to **Settings** → **Developer** tab
2. Click **"Run Diagnostic Test"**
3. Should show: ✅ **"Function is working"**

---

## 🔍 View Logs

```bash
# Real-time logs
supabase functions logs nylas-connect --tail

# List deployed functions
supabase functions list
```

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| "Failed to fetch" | Functions not deployed yet → Use Option A or deploy with Option B |
| "Nylas API key not configured" | Run: `supabase secrets set NYLAS_API_KEY=your_key` |
| "supabase: command not found" | Install CLI: `npm install -g supabase` |
| OAuth popup blocked | Allow popups for your domain |

---

## 📚 Full Documentation

- **Complete Guide:** `ACTIVATE_LIVE_EMAIL.md`
- **Quick Start:** `QUICK_START.md`
- **OAuth Details:** `OAUTH_SETUP_GUIDE.md`

---

## ✅ After Activation

You can now:
- ✉️ Connect Gmail/Outlook accounts
- 📤 Send emails from CRM
- 📥 Sync inbox automatically
- 🔗 Link emails to contacts/bids/appointments
- 📊 Track email analytics

---

**Choose your path: IMAP (instant) or OAuth (production)!**