# 🔧 Fix: Users API Error

## The Problem

You're seeing this error:
```
API Error [/users]: { "error": "Request failed" }
Failed to load users: Error: Request failed
```

## Why It's Happening

The Users API endpoints have been **added to your code** but are **not yet deployed** to your Supabase project. The backend code exists locally but Supabase doesn't know about it yet.

## The Solution

You need to **deploy the updated server function** to Supabase.

---

## 🚀 Quick Fix (Choose Your Method)

### Method 1: Use the Deployment Scripts

**macOS/Linux:**
```bash
chmod +x deploy-server.sh
./deploy-server.sh
```

**Windows PowerShell:**
```powershell
.\deploy-server.ps1
```

### Method 2: Manual Command

```bash
supabase functions deploy server
```

---

## 📋 First Time Setup (If Needed)

If you haven't set up Supabase CLI yet:

### 1. Install Supabase CLI

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Windows (PowerShell as Admin):**
```powershell
scoop install supabase
```

**Any OS (via npm):**
```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

This will open your browser for authentication.

### 3. Link Your Project

```bash
supabase link --project-ref usorqldwroecyxucmtuw
```

Enter your database password when prompted.

### 4. Deploy the Server Function

```bash
supabase functions deploy server
```

---

## ✅ After Deployment

1. Wait 10-30 seconds for deployment to complete
2. You'll see a success message with the function URL
3. **Refresh your browser** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
4. Navigate to the **Users** page
5. It should now load successfully! 🎉

---

## 🔍 Verify Deployment

Check if the function is deployed:

```bash
supabase functions list
```

You should see `server` in the list with a recent timestamp.

---

## 🆘 Troubleshooting

### "supabase: command not found"
- Install Supabase CLI using one of the methods above

### "Project not linked"
- Run: `supabase link --project-ref usorqldwroecyxucmtuw`

### "Authentication required"
- Run: `supabase login`

### Users page still shows error after deployment
- Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser console for any new errors
- Verify deployment: `supabase functions list`

---

## 📦 What's Being Deployed

The deployment adds these new API endpoints to your backend:

- **GET `/users`** - List all users in organization
- **POST `/users/invite`** - Invite new users
- **PUT `/users/:id`** - Update user information
- **DELETE `/users/:id`** - Remove users

All endpoints include:
- ✅ Authentication checks
- ✅ Role-based permissions (Admin/Super Admin only)
- ✅ Multi-tenant data isolation
- ✅ Audit logging
- ✅ Self-deletion prevention

---

## 💡 Why This Happens

Supabase Edge Functions run on Supabase's servers, not locally. When code is modified, it must be explicitly deployed to Supabase. Think of it like pushing code to production - the changes exist on your machine but need to be uploaded to the server.

---

## Need More Help?

- Supabase CLI Docs: https://supabase.com/docs/guides/cli
- Supabase Functions: https://supabase.com/docs/guides/functions
- Project Dashboard: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw
