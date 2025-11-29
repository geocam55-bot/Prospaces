# ✅ What To Do Now

You have everything ready to activate live email. Here's your action plan:

---

## 🎯 Choose One Option:

### Option 1: Quick Test (Recommended First)
**Time: 2 minutes | Works immediately**

1. Open ProSpaces CRM in your browser
2. Go to **Email** module
3. Click **"Add Account"**
4. Select **"IMAP/SMTP"** tab
5. For Gmail:
   - Server: `imap.gmail.com`
   - Port: `993`
   - Username: Your Gmail address
   - Password: [Create App Password](https://myaccount.google.com/apppasswords)
6. Click **"Connect Account"**
7. ✅ Done! Test sending/receiving emails

**Why start here:**
- Works in 2 minutes
- Tests the email UI
- No deployment needed
- Can upgrade to OAuth later

---

### Option 2: Production Deployment
**Time: 15 minutes | One-time setup**

**Copy these commands into your terminal:**

```bash
# 1. Login to Supabase (opens browser)
supabase login

# 2. Link project (enter DB password when asked)
supabase link --project-ref usorqldwroecyxucmtuw

# 3. Set Nylas API key
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv

# 4. Deploy functions (wait for each to complete)
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails

# 5. Verify
supabase functions list
```

**Then test in CRM:**
1. Settings → Developer → "Run Diagnostic Test"
2. Email → Add Account → OAuth → Gmail
3. Complete OAuth flow
4. ✅ Done! Full production email

**Why this option:**
- Production ready
- Secure server-side storage
- Auto email sync
- Multi-user support

---

## 📚 If You Need Help:

| Situation | Open This File |
|-----------|----------------|
| Just starting | `START_HERE.md` |
| Ready to deploy | `DEPLOY_COMMANDS.md` |
| Having issues | `TROUBLESHOOTING.md` |
| Want checklist | `DEPLOYMENT_CHECKLIST.md` |
| Need overview | `ACTIVATION_SUMMARY.md` |

---

## 🎯 Recommended Path:

1. **Try IMAP first (Option 1)** - Get familiar with the email UI
2. **Then deploy OAuth (Option 2)** - For production features
3. **Remove demo data** - Settings → Developer → Clean Demo Data

---

## ✅ After Activation Checklist:

- [ ] Email account connected
- [ ] Can send test email
- [ ] Can receive/sync emails
- [ ] Demo data removed
- [ ] Real contacts added
- [ ] Team members invited

---

**🚀 Pick an option above and activate live email now!**

**Questions?** Check `TROUBLESHOOTING.md` or `DOCUMENTATION_INDEX.md`
