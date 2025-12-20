# 🔑 Supabase Authorization Code - How to Get It

## ❓ What You're Seeing

After running `supabase login`, you see:
```
Enter your authorization code:
_
```

**This is normal!** Here's how to get the code.

---

## ✅ SOLUTION: Get the Authorization Code

### Method 1: From the Browser (After Clicking Link)

#### Step 1: Look at Your Terminal
You should see something like:
```
$ supabase login

Please click the link below to authorize the CLI:

https://api.supabase.com/v1/cli/authorize?token=ABC123...

Enter your authorization code:
_
```

#### Step 2: Click the URL
- Click the blue `https://api.supabase.com...` link
- A browser tab opens

#### Step 3: Authorize in Browser
You'll see a page that says:
```
┌─────────────────────────────────────┐
│  Authorize Supabase CLI             │
│                                     │
│  [Authorize] button                 │
└─────────────────────────────────────┘
```

Click **"Authorize"**

#### Step 4: Get the Code
After clicking "Authorize", the page will show:
```
┌─────────────────────────────────────┐
│  ✅ Authorization Successful        │
│                                     │
│  Your authorization code is:        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  sbp_abc123xyz456789...     │   │
│  └─────────────────────────────┘   │
│                                     │
│  Copy this code and paste it        │
│  into your terminal                 │
└─────────────────────────────────────┘
```

#### Step 5: Copy the Code
- The code looks like: `sbp_abc123xyz456789...`
- **Copy it** (click the code, Ctrl+C or Cmd+C)

#### Step 6: Paste in Terminal
- Go back to your Codespace tab
- Click in the terminal where it says `Enter your authorization code:`
- **Paste the code** (Ctrl+V or Cmd+V)
- Press **Enter**

#### Step 7: Success!
You should see:
```
✅ Logged in successfully
```

---

### Method 2: If the Link Isn't Clickable

#### Step 1: Copy the URL
If the link isn't clickable:
1. Select the entire URL in the terminal
2. Copy it (Ctrl+C)

#### Step 2: Open in New Tab
1. Open a new browser tab
2. Paste the URL
3. Press Enter

#### Step 3: Follow Steps 3-7 Above
Same as Method 1 from Step 3 onwards.

---

### Method 3: Direct Login (Alternative)

If the authorization page doesn't work, try this alternative:

#### Step 1: Cancel Current Login
In the terminal, press:
```
Ctrl + C
```
This cancels the current login attempt.

#### Step 2: Login with Access Token Instead

1. Go to: https://app.supabase.com/account/tokens
2. Click **"Generate new token"**
3. Name it: `Codespaces CLI`
4. Click **"Generate token"**
5. **Copy the token** (starts with `sbp_...`)

Then in the terminal, run:
```bash
supabase login --token sbp_YOUR_TOKEN_HERE
```

Replace `sbp_YOUR_TOKEN_HERE` with your actual token.

---

## 🔍 Visual Guide: What the Auth Page Looks Like

### Page 1: Before Authorization
```
┌──────────────────────────────────────────────┐
│  Supabase                          👤 Login  │
├──────────────────────────────────────────────┤
│                                              │
│       Authorize Supabase CLI                 │
│                                              │
│  The Supabase CLI is requesting access       │
│  to your account.                            │
│                                              │
│  This will allow the CLI to:                 │
│  • Deploy functions                          │
│  • Manage your projects                      │
│  • Access project settings                   │
│                                              │
│  ┌──────────────────────────────────┐       │
│  │      [Authorize]                  │       │
│  └──────────────────────────────────┘       │
│                                              │
│  [Cancel]                                    │
│                                              │
└──────────────────────────────────────────────┘
```

### Page 2: After Clicking "Authorize"
```
┌──────────────────────────────────────────────┐
│  Supabase                          👤 Login  │
├──────────────────────────────────────────────┤
│                                              │
│       ✅ Authorization Successful            │
│                                              │
│  Your authorization code is:                 │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  sbp_1a2b3c4d5e6f7g8h9i0j          📋 │ │
│  └────────────────────────────────────────┘ │
│       ▲                              ▲       │
│       └─ This is the code!           └─ Copy │
│                                              │
│  Copy this code and paste it into your       │
│  terminal to complete the login.             │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 📋 Step-by-Step Checklist

- [ ] Run `supabase login` in terminal
- [ ] See URL in terminal
- [ ] Click URL (or copy/paste to new tab)
- [ ] Browser opens to Supabase authorization page
- [ ] Click **"Authorize"** button
- [ ] See success page with authorization code
- [ ] **Copy the code** (starts with `sbp_...`)
- [ ] Go back to Codespace terminal
- [ ] **Paste the code** at the prompt
- [ ] Press **Enter**
- [ ] See ✅ "Logged in successfully"

---

## 🆘 Troubleshooting

### "The authorization page won't load"
**Fix:**
1. Make sure you're logged into Supabase in your browser
2. Go to: https://app.supabase.com/ and login first
3. Then try the authorization link again

### "I closed the page before copying the code"
**Fix:**
1. In terminal, press `Ctrl+C` to cancel
2. Run `supabase login` again
3. Click the new link
4. Authorize again

### "The code doesn't work / Invalid code"
**Fix:**
1. Make sure you copied the ENTIRE code (starts with `sbp_`)
2. No extra spaces before or after
3. Try the "Method 3: Direct Login" above

### "I don't see an authorization code on the page"
**Fix:**

The page might have auto-completed! Check your terminal:
- If you see ✅ "Logged in successfully" → You're done! Continue to next step!
- If still waiting for code → Try Method 3 (access token)

---

## ✅ After Successful Login

Once you see:
```
✅ Logged in successfully
```

Continue with the next commands:

```bash
# Next: Set Nylas API key (replace with YOUR key!)
supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_KEY_HERE

# Then: Link project
supabase link --project-ref usorqldwroecyxucmtuw

# Then: Deploy functions
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

---

## 🎯 Quick Reference

| What You See | What to Do |
|-------------|-----------|
| `Please click the link...` | Click the blue URL |
| Authorization page opens | Click **"Authorize"** button |
| `Your authorization code is:` | **Copy the code** |
| `Enter your authorization code:` | **Paste the code** + Enter |
| ✅ `Logged in successfully` | ✅ Continue to next step! |

---

## 📖 Related Files

- `/QUICK_FIX_NPM_ERROR.md` - Installing Supabase CLI
- `/FIX_NPM_ERROR_CODESPACES.md` - Complete error fix guide
- `/FIX_BOTH_OAUTH_ISSUES.md` - Full OAuth deployment guide

---

**The authorization code is on the success page after you click "Authorize"!** 🔑

**Look for code starting with `sbp_...`** ✅
