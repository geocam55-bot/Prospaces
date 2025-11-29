# Deploy Nylas Edge Functions - Quick Guide

## ✅ You've fixed the CORS issue! Now deploy the functions.

The CORS error means the Edge Functions aren't deployed yet. Follow these steps:

---

## Step 1: Install Supabase CLI

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or via npm
npm install -g supabase
```

---

## Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

---

## Step 3: Link Your Project

```bash
# Link to your project (use your project ref: usorqldwroecyxucmtuw)
supabase link --project-ref usorqldwroecyxucmtuw
```

---

## Step 4: Set Environment Secrets

You need to set the Nylas API key as a secret:

```bash
# Set your Nylas API key
supabase secrets set NYLAS_API_KEY=your_nylas_api_key_here
```

**Don't have a Nylas API key yet?** 
- Sign up at https://nylas.com
- Create a new application
- Copy your API key from the dashboard

---

## Step 5: Deploy the Edge Functions

Deploy all 4 Nylas functions:

```bash
# Deploy all functions
supabase functions deploy nylas-connect
supabase functions deploy nylas-callback
supabase functions deploy nylas-send-email
supabase functions deploy nylas-sync-emails
```

Or deploy all at once:

```bash
# Deploy all functions in one command
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails
```

---

## Step 6: Verify Deployment

Check that functions are deployed:

```bash
supabase functions list
```

You should see:
```
nylas-connect
nylas-callback
nylas-send-email
nylas-sync-emails
```

---

## Step 7: Test the Connection

Now go back to ProSpaces CRM and try connecting a Gmail account via OAuth!

The CORS error should be fixed. 🎉

---

## Troubleshooting

### "Function not found" error
- Make sure you're in the project root directory
- Run `supabase link --project-ref usorqldwroecyxucmtuw` again

### "Unauthorized" error
- Run `supabase login` again
- Make sure you're logged in with the correct account

### OAuth still fails
Check the function logs:
```bash
supabase functions logs nylas-connect --tail
```

### Need to update a function?
Just deploy it again:
```bash
supabase functions deploy nylas-connect
```

---

## What Each Function Does

1. **nylas-connect** - Initiates OAuth flow or connects IMAP accounts
2. **nylas-callback** - Handles OAuth callback from Nylas/Google
3. **nylas-send-email** - Sends emails via Nylas API
4. **nylas-sync-emails** - Syncs emails from connected accounts

---

## Next Steps

After deploying:
1. ✅ Try Gmail OAuth connection
2. ✅ Try IMAP/SMTP connection
3. ✅ Test sending emails
4. ✅ Test syncing emails

---

## Need Help?

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Nylas Documentation](https://developer.nylas.com/)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
