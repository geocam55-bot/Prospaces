# Azure OAuth Quick Start 🚀

Get Outlook OAuth working in 10 minutes without admin approval!

## ⚡ Quick Setup

### 1. Create Azure App (5 min)
1. Go to [Azure Portal](https://portal.azure.com) → **Entra ID** → **App registrations**
2. Click **New registration**:
   - Name: `ProSpaces CRM Email`
   - Account types: **Any organizational directory + personal accounts**
   - Redirect URI: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/azure-oauth-callback`
3. Copy **Application (client) ID**

### 2. Create Secret (1 min)
1. Click **Certificates & secrets** → **New client secret**
2. Description: `ProSpaces CRM`
3. Expiration: **24 months**
4. Copy the **Value** (this is shown only once!)

### 3. Add Permissions (2 min)
1. Click **API permissions** → **Add permission** → **Microsoft Graph** → **Delegated**
2. Add:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `User.Read`
   - `offline_access`
3. Click **Add permissions**

### 4. Deploy Functions (2 min)
```bash
supabase functions deploy azure-oauth-init
supabase functions deploy azure-oauth-callback
supabase functions deploy azure-sync-emails
supabase functions deploy azure-send-email

supabase secrets set AZURE_CLIENT_ID=your_client_id_here
supabase secrets set AZURE_CLIENT_SECRET=your_secret_here
supabase secrets set AZURE_REDIRECT_URI=https://YOUR_PROJECT_ID.supabase.co/functions/v1/azure-oauth-callback
supabase secrets set APP_URL=https://your-domain.com

supabase db push
```

### 5. Test It! ✅
1. Open CRM → **Email** → **Add Account** → **Microsoft Outlook**
2. Click **Connect with OAuth**
3. Sign in and accept permissions
4. Done! 🎉

---

## 🆘 Troubleshooting

**"Admin approval required"**
→ Use personal Outlook (@outlook.com) or ask IT admin

**"Invalid redirect URI"**
→ Check Azure app → Authentication → Redirect URIs match exactly

**"Function not deployed"**
→ Run `supabase functions deploy azure-oauth-init` again

---

## 📖 Full Guide
See [DEPLOY_AZURE_OAUTH.md](./DEPLOY_AZURE_OAUTH.md) for detailed instructions.

---

**✅ Benefits:**
- No admin consent required
- Works with work/school accounts
- Full control over permissions
- Free forever
