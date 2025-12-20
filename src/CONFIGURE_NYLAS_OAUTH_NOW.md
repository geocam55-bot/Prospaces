# 🔧 Configure Nylas OAuth - Fix "OAuth Setup Required"

## 📸 The Errors You're Seeing:

```
⚠️ OAuth Setup Required

To use OAuth authentication, your administrator needs to configure:
• Azure AD app registration
• OAuth 2.0 client credentials  
• Authorized redirect URIs

⚠️ Unable to connect to email backend. The Edge Functions may not be deployed yet.
```

---

## ✅ YOU'RE ALMOST THERE!

You've likely deployed the Edge Functions (good job!), but you **MUST** configure Nylas OAuth!

**This is THE KEY STEP that fixes "OAuth Setup Required"!**

---

## 🚀 FIX BOTH ERRORS - DO THIS NOW:

### **Part A: Configure Microsoft OAuth in Nylas** (10 min)

This fixes the **"OAuth Setup Required"** error!

---

#### **Step 1: Open Nylas Dashboard**

Go to: **https://dashboard.nylas.com**

**Don't have a Nylas account yet?**
1. Click **"Sign Up"**
2. Verify your email
3. Come back to dashboard

---

#### **Step 2: Create or Open Your App**

**If you DON'T have an app yet:**
1. Click **"Create a New App"** or **"New Application"**
2. App Name: `ProSpaces CRM`
3. Click **"Create"**

**If you ALREADY have an app:**
1. Click on your app name (e.g., "ProSpaces CRM")

---

#### **Step 3: Copy Your API Key** 🔑

**IMPORTANT:** You need this for the Edge Functions!

1. In your app dashboard, you'll see: **"API Key"**
2. It looks like: `nyk_v0_abc123...`
3. **COPY IT!** 

**DID YOU ALREADY SET THIS IN SUPABASE?**
- ✅ **YES** → Great! Skip to Step 4
- ❌ **NO** → You need to run this command in Codespaces:
  ```bash
  supabase secrets set NYLAS_API_KEY=nyk_v0_YOUR_KEY_HERE
  ```
  (Replace with your actual key!)

---

#### **Step 4: Configure Microsoft Integration** ⭐ **THIS IS THE KEY!**

This is what fixes the "OAuth Setup Required" error!

1. In Nylas Dashboard, look for **"Integrations"** in the left sidebar
2. Click **"Integrations"**
3. Find **"Microsoft"** or **"Outlook"** in the list
4. Click **"Configure"** or **"Connect"** next to Microsoft

---

#### **Step 5: Choose Auth Method**

You'll see **2 options**:

##### **OPTION A: Use Nylas Hosted Auth** ⭐ **RECOMMENDED - EASIEST!**

1. Click **"Use Nylas Hosted Auth"** or **"Nylas Hosted Authentication"**
2. Click **"Save"** or **"Enable"**
3. Status should change to **"Connected"** or **"Active"** ✅

**This is the easiest!** Nylas handles ALL the Azure AD configuration for you!

**✅ DONE! Skip to Step 6!**

---

##### **OPTION B: Use Your Own Azure AD App** (Advanced - Optional)

Only do this if you want your own Azure AD app (most users don't need this!).

1. Go to: https://portal.azure.com
2. Click **"Azure Active Directory"**
3. Click **"App registrations"** → **"New registration"**
4. **Name:** `ProSpaces CRM Email`
5. **Supported account types:** 
   - "Accounts in any organizational directory and personal Microsoft accounts"
6. **Redirect URI:**
   - Platform: **Web**
   - URL: `https://api.us.nylas.com/v3/connect/callback`
7. Click **"Register"**

8. **Copy the Application (client) ID**

9. Click **"Certificates & secrets"** → **"New client secret"**
   - Description: `ProSpaces CRM Secret`
   - Expires: 24 months
   - Click **"Add"**
   - **COPY THE SECRET VALUE** (you can only see it once!)

10. Click **"API permissions"** → **"Add a permission"**
    - Microsoft Graph → Delegated permissions
    - Add these permissions:
      - `Mail.Read`
      - `Mail.ReadWrite`
      - `Mail.Send`
      - `offline_access`
      - `User.Read`
    - Click **"Add permissions"**
    - Click **"Grant admin consent"** (if you're admin)

11. Go back to Nylas Dashboard
12. Paste your **Client ID** and **Client Secret**
13. Click **"Save"**

---

#### **Step 6: Verify Microsoft is Connected**

In Nylas Dashboard → Integrations:
- **Microsoft** should show **"Connected"** or **"Active"** status ✅

**If it doesn't say "Connected":**
- Go back to Step 4 and try again
- Make sure you clicked "Save"

---

#### **Step 7: Configure Redirect URI** 🔗

This is **CRITICAL!** Without this, OAuth won't work!

1. Still in Nylas Dashboard, click your app name
2. Click **"Settings"** or **"App Settings"**
3. Find **"Redirect URIs"** or **"Allowed Redirect URIs"** or **"Callback URLs"**
4. Click **"Add"** or **"Add Redirect URI"**
5. Enter this **EXACT URL**:
   ```
   https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback
   ```
6. Click **"Save"** or **"Add"**

**IMPORTANT:** The URL must be EXACTLY as shown above! No trailing slash!

---

### **Part B: Verify Edge Functions Are Deployed**

Let's make sure the backend is actually running!

#### **Method 1: Check in Supabase Dashboard**

1. Go to: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/functions
2. You should see **7 functions**:
   - `nylas-connect`
   - `nylas-callback`
   - `nylas-send-email`
   - `nylas-sync-emails`
   - `nylas-webhook`
   - `nylas-sync-calendar`
   - `nylas-create-event`
3. Each should show **"Active"** or a version number

**Don't see all 7 functions?** → Go back to Codespaces and deploy them!

#### **Method 2: Check in Codespaces**

If you still have Codespaces open:
```bash
supabase functions list
```

Should show:
```
┌──────────────────────┬──────────┬─────────┐
│ Name                 │ Status   │ Version │
├──────────────────────┼──────────┼─────────┤
│ nylas-connect        │ deployed │ v1      │
│ nylas-callback       │ deployed │ v1      │
│ nylas-send-email     │ deployed │ v1      │
│ nylas-sync-emails    │ deployed │ v1      │
│ nylas-webhook        │ deployed │ v1      │
│ nylas-sync-calendar  │ deployed │ v1      │
│ nylas-create-event   │ deployed │ v1      │
└──────────────────────┴──────────┴─────────┘
```

**Don't see this?** Run the deploy command again:
```bash
supabase functions deploy nylas-connect nylas-callback nylas-send-email nylas-sync-emails nylas-webhook nylas-sync-calendar nylas-create-event
```

---

## ✅ CHECKLIST - Make Sure You Did ALL of These:

- [ ] Nylas account created
- [ ] App created in Nylas: "ProSpaces CRM"
- [ ] API Key copied
- [ ] API Key set in Supabase secrets: `supabase secrets set NYLAS_API_KEY=...`
- [ ] Microsoft integration ENABLED in Nylas Dashboard
- [ ] Microsoft shows "Connected" status in Nylas
- [ ] Redirect URI added: `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/nylas-callback`
- [ ] All 7 Edge Functions deployed to Supabase
- [ ] Functions show "deployed" status in `supabase functions list`

---

## 🧪 TEST NOW!

After completing ALL the steps above:

1. **Refresh ProSpaces CRM** in your browser
2. Click **"Email"** → **"Add Email Account"**
3. Make sure **"OAuth"** tab is selected
4. Select **"Microsoft Outlook"** from dropdown
5. Click **"Connect Microsoft Outlook"**

---

## 🎯 EXPECTED RESULTS:

### ✅ **SUCCESS** (Both errors gone!):
```
Click "Connect Microsoft Outlook"
  ↓
Redirects to Nylas authorization page
  ↓
Shows "Connect to Microsoft"
  ↓
Redirects to Microsoft login
  ↓
Login with Microsoft account
  ↓
Grant permissions
  ↓
Redirects back to ProSpaces
  ↓
✅ "Email account connected successfully!"
```

### ❌ **Still seeing "OAuth Setup Required":**
**Cause:** Microsoft not configured in Nylas

**Fix:**
1. Go to Nylas Dashboard → Integrations
2. Microsoft should show **"Connected"**
3. If not, go back to Step 4 above

### ❌ **Still seeing "Unable to connect to email backend":**
**Cause:** Edge Functions not deployed or API key not set

**Fix:**
1. Check Supabase Dashboard → Functions (should see 7)
2. Run `supabase functions list` in Codespaces
3. Make sure API key is set: `supabase secrets set NYLAS_API_KEY=...`

---

## 🔍 WHY YOU'RE SEEING BOTH ERRORS:

| Error | Why It Happens | How to Fix |
|-------|---------------|-----------|
| **"OAuth Setup Required"** | Nylas doesn't have Microsoft OAuth configured | ✅ Enable Microsoft in Nylas Dashboard (Step 4) |
| **"Unable to connect to email backend"** | Edge Functions not deployed OR API key not set | ✅ Deploy functions + Set API key (Part B) |

**BOTH must be fixed!** You need:
1. ✅ Nylas configured with Microsoft OAuth
2. ✅ Edge Functions deployed to Supabase
3. ✅ API key set in Supabase secrets
4. ✅ Redirect URI configured in Nylas

---

## 🎨 Visual: What You Need to Configure

```
┌─────────────────────────────────────────────┐
│  NYLAS DASHBOARD                            │
│  https://dashboard.nylas.com                │
├─────────────────────────────────────────────┤
│                                             │
│  1. App Created: "ProSpaces CRM" ✅         │
│                                             │
│  2. Integrations:                           │
│     ┌─────────────────────────────────┐    │
│     │ Microsoft      [Connected] ✅   │    │
│     └─────────────────────────────────┘    │
│                                             │
│  3. Settings → Redirect URIs:               │
│     ┌─────────────────────────────────┐    │
│     │ https://usorqldwroecyxucmtuw... │ ✅ │
│     └─────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 📖 Related Files:

- `/FIX_BOTH_OAUTH_ISSUES.md` - Complete OAuth setup guide
- `/WHATS_NEXT_AFTER_LOGIN.md` - After Supabase login steps
- `/OAUTH_TROUBLESHOOTING.md` - If you have issues

---

## 🆘 STILL STUCK?

Share:
1. Screenshot of Nylas Dashboard → Integrations (Microsoft status?)
2. Screenshot of Supabase Dashboard → Functions (do you see 7?)
3. What happens when you click "Connect Microsoft Outlook"

---

**The #1 thing people miss: Enabling Microsoft in Nylas Dashboard!** ⭐

**Go to Nylas Dashboard → Integrations → Microsoft → Configure → Use Nylas Hosted Auth!** 🚀
