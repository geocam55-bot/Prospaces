# 🚀 ProSpaces CRM - Deployment Commands

## ⚡ Copy & Paste These Commands

### Step 1: Create Database Tables

```bash
supabase db push
```

**Wait for confirmation:** You should see: `Finished supabase db push.`

This creates the `email_accounts` and `emails` tables in your database.

---

### Step 2: Set the Nylas API Key Secret

```bash
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv
```

**Wait for confirmation:** You should see: `Finished supabase secrets set.`

---

### Step 3: Deploy the Edge Functions

Copy and paste these one at a time:

```bash
supabase functions deploy nylas-connect
```

Wait for: `✓ Deployed Function nylas-connect`

```bash
supabase functions deploy nylas-callback
```

Wait for: `✓ Deployed Function nylas-callback`

```bash
supabase functions deploy nylas-send-email
```

Wait for: `✓ Deployed Function nylas-send-email`

```bash
supabase functions deploy nylas-sync-emails
```

Wait for: `✓ Deployed Function nylas-sync-emails`

---

### Step 4: Verify Deployment

```bash
supabase functions list
```

You should see all 4 functions listed as ACTIVE:
- ✅ nylas-connect
- ✅ nylas-callback
- ✅ nylas-send-email
- ✅ nylas-sync-emails

---

### Step 5: Test in the CRM

1. Open ProSpaces CRM in your browser
2. Go to **Settings** → **Developer** tab
3. Click **"Run Diagnostic Test"**
4. You should see: ✅ **"Function is working"**

---

### Step 6: Connect Your Gmail Account

1. Go to **Email** module
2. Click **"Add Account"**
3. Select **OAuth** tab
4. Click on **Gmail**
5. Click **"Connect Gmail"**
6. Complete the OAuth flow in the popup

---

## 🔍 Troubleshooting

### If you get "supabase: command not found"

First, make sure you're in the project directory where your code is.

Then install the Supabase CLI:

```bash
npm install -g supabase
```

### If you get "Not logged in"

```bash
supabase login
```

This will open your browser to authenticate.

### If you get "Project not linked"

```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

Enter your database password when prompted.

### View Real-time Logs

If something's not working, check the logs:

```bash
supabase functions logs nylas-connect --tail
```

Then try connecting your email account and watch for errors.

---

## ✅ Success Checklist

After running all commands:

- [ ] Database tables are created
- [ ] API key secret is set
- [ ] All 4 functions are deployed
- [ ] `supabase functions list` shows all 4 as ACTIVE
- [ ] Diagnostic test shows "Function is working"
- [ ] Can connect Gmail account via OAuth
- [ ] Can view emails in the CRM

---

## 📝 All Commands in Order

```bash
# 1. Create database tables
supabase db push

# 2. Set API key
supabase secrets set NYLAS_API_KEY=nyk_v0_c66Qn575iBdA2TPQzA4Dpa2qmK5XG4ID3rfF57FGb4kKutfWgpg4DtD5LugO6vJv

# 3. Deploy functions
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails

# 4. Verify
supabase functions list

# 5. View logs (optional)
supabase functions logs nylas-connect --tail
```

---

**Ready? Copy the commands above and run them in your terminal!** 🚀