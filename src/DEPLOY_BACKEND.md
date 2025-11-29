# Backend Deployment Guide

## Issue
The following endpoints are returning 404 errors:
- `/project-managers/customer/:customerId`
- `/bids/opportunity/:opportunityId`

**Root Cause:** The backend routes have an incorrect `/make-server-8405be07` prefix that causes double-prefixing when the function is deployed.

### How Supabase Edge Functions Work
- Function deployed as `make-server-8405be07`
- Route in code: `/auth/signup`
- Actual URL: `https://PROJECT.supabase.co/functions/v1/make-server-8405be07/auth/signup` ✅

- Current routes have: `/make-server-8405be07/auth/signup` 
- Actual URL becomes: `https://PROJECT.supabase.co/functions/v1/make-server-8405be07/make-server-8405be07/auth/signup` ❌

## Quick Fix & Deploy (Recommended)

### Option 1: Use the automated script (Fastest)

```bash
# Make the script executable
chmod +x fix-and-deploy.sh

# Run it
./fix-and-deploy.sh
```

This script will:
1. Backup your original file
2. Remove the `/make-server-8405be07` prefix from all 49 routes
3. Deploy the function to Supabase
4. Test the health endpoint
5. Restore backup if deployment fails

### Option 2: Manual fix with sed (Quick)

**macOS:**
```bash
sed -i '' "s/app\.\(get\|post\|put\|delete\)('\/make-server-8405be07\//app.\1('\//g" supabase/functions/server/index.tsx
supabase functions deploy make-server-8405be07 --no-verify-jwt
```

**Linux:**
```bash
sed -i "s/app\.\(get\|post\|put\|delete\)('\/make-server-8405be07\//app.\1('\//g" supabase/functions/server/index.tsx
supabase functions deploy make-server-8405be07 --no-verify-jwt
```

### Option 3: Manual Search & Replace (Slower)

1. Open `/supabase/functions/server/index.tsx`
2. Find all: `app.get('/make-server-8405be07/`
3. Replace with: `app.get('/`
4. Find all: `app.post('/make-server-8405be07/`
5. Replace with: `app.post('/`
6. Find all: `app.put('/make-server-8405be07/`
7. Replace with: `app.put('/`
8. Find all: `app.delete('/make-server-8405be07/`
9. Replace with: `app.delete('/`
10. Save the file
11. Deploy: `supabase functions deploy make-server-8405be07 --no-verify-jwt`

## Full Deployment Steps

### Prerequisites

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref usorqldwroecyxucmtuw
   ```

### Deploy

1. **Fix the routes** (choose one method from above)

2. **Deploy the function**:
   ```bash
   supabase functions deploy make-server-8405be07 --no-verify-jwt
   ```

   Note: `--no-verify-jwt` is used because we're handling JWT verification in the code itself.

3. **Verify deployment**:
   ```bash
   curl https://usorqldwroecyxucmtuw.supabase.co/functions/v1/make-server-8405be07/health
   ```
   
   Expected response: `{"status":"ok","timestamp":"..."}`

## Verification

After deployment, test the specific endpoints that were failing:

1. **Health check** (no auth required):
   ```bash
   curl https://usorqldwroecyxucmtuw.supabase.co/functions/v1/make-server-8405be07/health
   ```

2. **Test in the app**:
   - Open OpportunityDetail page
   - Click "Fix Organization IDs" button
   - Check browser console - the 404 errors should be gone
   - The bid list should load correctly

## Troubleshooting

### Still getting 404s after deployment?

1. **Check the function name in Supabase Dashboard**:
   - Go to https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/functions
   - Verify the function name is exactly `make-server-8405be07`

2. **Check the routes were actually fixed**:
   ```bash
   grep "app.get('/make-server-8405be07/" supabase/functions/server/index.tsx
   ```
   This should return NO results after the fix.

3. **Check function logs**:
   - Supabase Dashboard → Functions → make-server-8405be07 → Logs
   - Look for any runtime errors

4. **Redeploy**:
   ```bash
   supabase functions deploy make-server-8405be07 --no-verify-jwt --force
   ```

### Browser still shows old errors?

1. **Clear browser cache** and refresh
2. **Check the Network tab** in DevTools to see the actual URLs being called
3. **Hard refresh**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)

## Current Status

❌ Routes have incorrect prefix (49 routes affected)  
❌ Backend function not deployed or has wrong routes  
✅ Frontend has fallback to client-side queries (currently working)  
✅ Fix scripts provided (`fix-and-deploy.sh`)  

## After Successful Deployment

Once deployed correctly:
- ✅ Frontend will automatically use backend endpoints
- ✅ Better performance (server-side queries)
- ✅ Proper organization isolation
- ✅ No more 404 errors in console
- ✅ The "Fix Organization IDs" button will work correctly
- ✅ Kohltech Windows & Doors bid will appear in the opportunity's bid list