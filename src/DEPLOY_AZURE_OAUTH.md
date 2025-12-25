# Azure OAuth Setup for ProSpaces CRM

This guide walks you through setting up custom Azure OAuth for Outlook/Microsoft 365 email integration, giving you full control over permissions and avoiding admin consent issues.

## 🎯 Why Custom Azure OAuth?

- ✅ **No admin approval required** - You control the app permissions
- ✅ **Works with work/school accounts** - Unlike Nylas shared app
- ✅ **Your branding** - OAuth consent screen shows your app name
- ✅ **Minimal permissions** - Only request what you need
- ✅ **Free** - No third-party service fees

---

## 📋 Prerequisites

- Azure account (free)
- Supabase project set up
- ProSpaces CRM deployed

---

## Step 1: Create Azure App Registration

### 1.1 Go to Azure Portal
1. Visit [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID** (formerly Azure AD)
3. Click **App registrations** in the left menu
4. Click **+ New registration**

### 1.2 Configure App Registration
Fill in the form:
- **Name:** `ProSpaces CRM Email`
- **Supported account types:** 
  - Select: **Accounts in any organizational directory and personal Microsoft accounts**
  - This allows both work/school and personal Outlook accounts
- **Redirect URI:**
  - Platform: **Web**
  - URI: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/azure-oauth-callback`
  - Replace `YOUR_PROJECT_ID` with your actual Supabase project ID

Click **Register**.

### 1.3 Note Your Credentials
After creation, you'll see the **Overview** page. Copy these values:
- **Application (client) ID** - You'll need this as `AZURE_CLIENT_ID`
- **Directory (tenant) ID** - Not needed for multi-tenant apps

---

## Step 2: Create Client Secret

### 2.1 Generate Secret
1. In your app registration, click **Certificates & secrets** in the left menu
2. Click **+ New client secret**
3. Add a description: `ProSpaces CRM Production`
4. Select expiration: **24 months** (recommended) or **Custom**
5. Click **Add**

### 2.2 Copy Secret Value
**⚠️ IMPORTANT:** Copy the **Value** immediately - you can't see it again!
- This is your `AZURE_CLIENT_SECRET`
- Store it securely (password manager recommended)

---

## Step 3: Configure API Permissions

### 3.1 Add Microsoft Graph Permissions
1. Click **API permissions** in the left menu
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions** (NOT Application permissions)
5. Add these permissions:
   - ✅ `Mail.Read` - Read user mail
   - ✅ `Mail.ReadWrite` - Organize and delete mail
   - ✅ `Mail.Send` - Send mail as the user
   - ✅ `User.Read` - Sign in and read user profile
   - ✅ `offline_access` - Maintain access to data
6. Click **Add permissions**

### 3.2 Grant Admin Consent (Optional but Recommended)
If you're an admin for your organization:
1. Click **Grant admin consent for [Your Organization]**
2. Click **Yes**

**Note:** This is optional. Users can still consent individually if you don't grant admin consent.

### 3.3 Enable Public Client Flow (Optional)
For better mobile/desktop support:
1. Click **Authentication** in the left menu
2. Scroll to **Advanced settings**
3. Under **Allow public client flows**, select **Yes**
4. Click **Save**

---

## Step 4: Deploy Edge Functions

### 4.1 Deploy Azure OAuth Functions
```bash
# Deploy all Azure OAuth functions
supabase functions deploy azure-oauth-init
supabase functions deploy azure-oauth-callback
supabase functions deploy azure-sync-emails
supabase functions deploy azure-send-email
```

### 4.2 Set Supabase Secrets
```bash
# Set Azure credentials as Supabase secrets
supabase secrets set AZURE_CLIENT_ID=your_application_client_id_here
supabase secrets set AZURE_CLIENT_SECRET=your_client_secret_value_here
supabase secrets set AZURE_REDIRECT_URI=https://YOUR_PROJECT_ID.supabase.co/functions/v1/azure-oauth-callback
supabase secrets set APP_URL=https://your-crm-domain.com
```

Replace:
- `your_application_client_id_here` - Application (client) ID from Step 1.3
- `your_client_secret_value_here` - Secret value from Step 2.2
- `YOUR_PROJECT_ID` - Your Supabase project ID
- `https://your-crm-domain.com` - Your CRM's public URL

### 4.3 Verify Secrets
```bash
supabase secrets list
```

You should see:
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_REDIRECT_URI`
- `APP_URL`

---

## Step 5: Run Database Migration

### 5.1 Apply Migration
```bash
supabase db push
```

This creates:
- `oauth_states` table for CSRF protection
- `azure_access_token`, `azure_refresh_token`, `azure_token_expires_at` columns in `email_accounts` table

### 5.2 Verify Migration
```sql
-- Check if columns were added
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'email_accounts' 
AND column_name LIKE 'azure%';

-- Check if oauth_states table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'oauth_states';
```

---

## Step 6: Test the Integration

### 6.1 Connect an Outlook Account
1. Open your ProSpaces CRM
2. Go to **Email** module
3. Click **Add Account**
4. Select **Microsoft Outlook**
5. Click **Connect with OAuth**
6. Sign in with your Microsoft account
7. **Accept the consent screen** - you'll see your app name "ProSpaces CRM Email"
8. You should be redirected back to the CRM with a success message

### 6.2 Test Email Sync
1. Select your connected Outlook account
2. Click **Sync**
3. Emails should sync from your Outlook inbox

### 6.3 Test Email Sending
1. Click **Compose**
2. Enter recipient, subject, and body
3. Click **Send**
4. Email should send successfully via Microsoft Graph API

---

## 🔧 Troubleshooting

### "Admin approval required" Error
**Problem:** Tenant requires admin consent for all apps

**Solutions:**
1. **Ask your IT admin** to grant consent for your app
2. **Use personal Outlook account** (@outlook.com, @hotmail.com) instead
3. **Request admin to enable user consent:**
   - Azure Portal → Entra ID → Enterprise applications → User settings
   - Set "Users can consent to apps" to **Yes**

### "Invalid redirect URI" Error
**Problem:** Redirect URI doesn't match Azure app registration

**Solution:**
1. Verify `AZURE_REDIRECT_URI` secret matches exactly:
   ```
   https://YOUR_PROJECT_ID.supabase.co/functions/v1/azure-oauth-callback
   ```
2. Check Azure app registration → Authentication → Redirect URIs

### "Token expired" Error
**Problem:** Access token expired and refresh failed

**Solution:**
1. Reconnect the account (disconnect and connect again)
2. Check `AZURE_CLIENT_SECRET` is correct
3. Ensure client secret hasn't expired in Azure Portal

### "Function not deployed" Error
**Problem:** Edge Function not found

**Solution:**
```bash
# Redeploy all Azure functions
supabase functions deploy azure-oauth-init
supabase functions deploy azure-oauth-callback
supabase functions deploy azure-sync-emails
supabase functions deploy azure-send-email
```

### Check Edge Function Logs
```bash
# View real-time logs
supabase functions logs azure-oauth-init --follow
supabase functions logs azure-oauth-callback --follow
supabase functions logs azure-sync-emails --follow
supabase functions logs azure-send-email --follow
```

---

## 🔐 Security Best Practices

### 1. Rotate Client Secrets Regularly
- Set expiration to 24 months max
- Create calendar reminder to rotate before expiration
- Update `AZURE_CLIENT_SECRET` when rotating

### 2. Restrict Redirect URIs
- Only add your production Supabase URL
- Don't use wildcards
- Remove localhost URIs in production

### 3. Monitor App Permissions
- Regularly review permissions in Azure Portal
- Remove unused permissions
- Audit sign-in logs

### 4. Use Managed Identities (Advanced)
For production deployments on Azure:
- Consider using Azure Managed Identities
- Eliminates need to store client secrets
- Requires hosting on Azure infrastructure

---

## 📊 Comparison: Azure OAuth vs Nylas

| Feature | Custom Azure OAuth | Nylas Hosted Auth |
|---------|-------------------|-------------------|
| **Admin Consent** | Not required (you control) | Often required (shared app) |
| **Cost** | Free | Paid after free tier |
| **Setup Complexity** | Medium | Low |
| **Control** | Full control | Limited |
| **Branding** | Your app name | "Nylas" branding |
| **Permissions** | Minimal (only what you need) | Broad permissions |
| **Multi-Provider** | Outlook only | Gmail, Outlook, more |

---

## 🎯 Next Steps

### For Gmail Users
Gmail still uses Nylas OAuth. To set up Gmail:
1. Follow the existing Nylas setup guide
2. Deploy `nylas-connect` and `nylas-sync-emails` functions
3. Set `NYLAS_API_KEY` and `NYLAS_CLIENT_ID` secrets

### Production Hardening
1. **Enable monitoring:**
   - Set up Supabase alerts for function errors
   - Monitor token refresh failures
   
2. **Add rate limiting:**
   - Implement rate limits on Edge Functions
   - Prevent abuse of OAuth endpoints

3. **Add error tracking:**
   - Integrate Sentry or similar for error monitoring
   - Track OAuth failures and token refresh issues

---

## 📚 Additional Resources

- [Microsoft Identity Platform Docs](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Microsoft Graph API Reference](https://docs.microsoft.com/en-us/graph/api/overview)
- [Azure App Registration Best Practices](https://docs.microsoft.com/en-us/azure/active-directory/develop/security-best-practices-for-app-registration)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)

---

## 🆘 Support

If you encounter issues:
1. Check Edge Function logs: `supabase functions logs [function-name]`
2. Verify all secrets are set: `supabase secrets list`
3. Review Azure app registration settings
4. Check database migration ran successfully

**Common Issues:**
- ✅ Redirect URI mismatch → Check Azure app registration
- ✅ Admin consent required → Use personal account or request admin approval
- ✅ Token refresh fails → Check client secret is valid
- ✅ Function 404 → Deploy Edge Functions

---

**✅ You're all set!** Your ProSpaces CRM now has custom Azure OAuth for Outlook with full control over permissions and no admin consent issues.
