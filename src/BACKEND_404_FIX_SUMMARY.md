# Backend 404 Errors - Fix Summary

## 🔴 Current Issue
When testing the "Fix Organization IDs" button in OpportunityDetail, you're seeing these 404 errors:

```
GET /functions/v1/make-server-8405be07/project-managers/customer/1763478008499-xrshjleb4 404
GET /functions/v1/make-server-8405be07/bids/opportunity/4a729dd1-680f-4610-840c-7dd8c62ca878 404
```

## 🔍 Root Cause
The backend routes in `/supabase/functions/server/index.tsx` have an incorrect `/make-server-8405be07/` prefix (49 routes affected).

**How it works:**
- ✅ Correct: Function named `make-server-8405be07` + Route `/bids` = URL `/functions/v1/make-server-8405be07/bids`
- ❌ Wrong: Function named `make-server-8405be07` + Route `/make-server-8405be07/bids` = URL `/functions/v1/make-server-8405be07/make-server-8405be07/bids`

## ✅ The Fix (3 Simple Steps)

### Step 1: Fix the Routes
Choose ONE of these methods:

**Method A - Automated Script (Recommended):**
```bash
chmod +x fix-and-deploy.sh
./fix-and-deploy.sh
```

**Method B - One-line sed command:**

macOS:
```bash
sed -i '' "s/app\.\(get\|post\|put\|delete\)('\/make-server-8405be07\//app.\1('\//g" supabase/functions/server/index.tsx
```

Linux:
```bash
sed -i "s/app\.\(get\|post\|put\|delete\)('\/make-server-8405be07\//app.\1('\//g" supabase/functions/server/index.tsx
```

**Method C - Manual Find & Replace:**
1. Open `supabase/functions/server/index.tsx` in your editor
2. Find: `('/make-server-8405be07/`
3. Replace with: `('/`
4. Replace all (49 occurrences)

### Step 2: Deploy to Supabase
```bash
# If you haven't already
supabase login
supabase link --project-ref usorqldwroecyxucmtuw

# Deploy the fixed function
supabase functions deploy make-server-8405be07 --no-verify-jwt
```

### Step 3: Verify It Works
```bash
# Test the health endpoint
curl https://usorqldwroecyxucmtuw.supabase.co/functions/v1/make-server-8405be07/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-..."}
```

## 📊 Expected Results

### Before Fix:
- ❌ 404 errors in console
- ⚠️ Frontend uses client-side fallback queries
- ⚠️ Slower performance
- ❌ Bid may not appear in opportunity list after "Fix Organization IDs"

### After Fix:
- ✅ No 404 errors
- ✅ Backend endpoints respond correctly
- ✅ Faster performance (server-side queries)
- ✅ Kohltech Windows & Doors bid appears in opportunity list
- ✅ "Fix Organization IDs" button works as expected

## 🧪 Testing After Deployment

1. **Open your ProSpaces CRM app**
2. **Navigate to the Opportunity** with Kohltech Windows & Doors bid
3. **Open Browser DevTools** → Console tab
4. **Click "Fix Organization IDs"** button
5. **Check the console** - you should see:
   ```
   ✅ GET .../project-managers/customer/... 200 OK
   ✅ GET .../bids/opportunity/... 200 OK
   ```
   (No more 404 errors!)

6. **Verify the bids list** loads and shows the Kohltech Windows & Doors bid

## 📚 Documentation

- `/DEPLOY_BACKEND.md` - Complete deployment guide with all options
- `/ROUTE_FIXES_NEEDED.md` - Detailed list of all 49 routes that need fixing
- `/fix-and-deploy.sh` - Automated fix and deploy script
- `/fix-server-routes.js` - Node.js script alternative (if you prefer)

## 🆘 Troubleshooting

### "supabase command not found"
```bash
npm install -g supabase
```

### Still getting 404s after deployment?
1. Check the function is deployed:
   - Go to https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/functions
   - Should see `make-server-8405be07` function listed

2. Check the routes were actually fixed:
   ```bash
   grep "'/make-server-8405be07/" supabase/functions/server/index.tsx
   ```
   Should return nothing (0 matches)

3. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)

4. Check function logs in Supabase Dashboard

### Need help?
Check `/DEPLOY_BACKEND.md` for detailed troubleshooting steps.

## 🎯 Summary

**Problem:** Backend routes have wrong prefix → 404 errors  
**Solution:** Remove `/make-server-8405be07` prefix from all routes → Deploy  
**Time:** ~2 minutes  
**Impact:** Fixes 2 critical 404 errors, enables proper backend functionality  

---

**Ready to fix it?** Run `./fix-and-deploy.sh` or follow Step 1-3 above! 🚀
