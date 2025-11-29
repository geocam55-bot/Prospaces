# Quick Fix Guide - Backend 404 Errors

## TL;DR - 30 Second Fix

```bash
# 1. Fix the routes (choose one)
sed -i '' "s/app\.\(get\|post\|put\|delete\)('\/make-server-8405be07\//app.\1('\//g" supabase/functions/server/index.tsx  # macOS
sed -i "s/app\.\(get\|post\|put\|delete\)('\/make-server-8405be07\//app.\1('\//g" supabase/functions/server/index.tsx     # Linux

# 2. Deploy
supabase functions deploy make-server-8405be07 --no-verify-jwt

# 3. Test
curl https://usorqldwroecyxucmtuw.supabase.co/functions/v1/make-server-8405be07/health
```

Done! ✅

---

## OR Use the Automated Script

```bash
chmod +x fix-and-deploy.sh
./fix-and-deploy.sh
```

Done! ✅

---

## What This Fixes

✅ **404 Error:** `/project-managers/customer/:customerId`  
✅ **404 Error:** `/bids/opportunity/:opportunityId`  
✅ All 49 backend routes now work correctly  
✅ "Fix Organization IDs" button in OpportunityDetail works  
✅ Kohltech Windows & Doors bid appears in opportunity list  

---

## Verify It Worked

**Before:**
```
❌ GET .../bids/opportunity/... 404 (Not Found)
⚠️  Using client-side bids by opportunity implementation (backend not deployed)
```

**After:**
```
✅ GET .../bids/opportunity/... 200 (OK)
✅ [backend response] Successfully loaded X bids
```

---

## Need More Info?

| What You Need | See This File |
|--------------|---------------|
| **Quick summary** | `/BACKEND_404_FIX_SUMMARY.md` |
| **Detailed deployment** | `/DEPLOY_BACKEND.md` |
| **List of all route fixes** | `/ROUTE_FIXES_NEEDED.md` |
| **Verification steps** | `/VERIFICATION_CHECKLIST.md` |
| **Automated script** | `/fix-and-deploy.sh` |

---

## Troubleshooting

**"supabase command not found"**
```bash
npm install -g supabase
supabase login
```

**"Still getting 404 errors"**
```bash
# Verify routes were fixed
grep "'/make-server-8405be07/" supabase/functions/server/index.tsx
# Should return nothing

# Hard refresh browser
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
```

**"Deployment failed"**
- Check Supabase Dashboard → Functions → Logs
- Ensure you're linked to the right project:
  ```bash
  supabase link --project-ref usorqldwroecyxucmtuw
  ```

---

## The Problem (Technical)

Routes in `/supabase/functions/server/index.tsx` have this:
```typescript
app.get('/make-server-8405be07/bids/opportunity/:id', ...)  // ❌ WRONG
```

Should be:
```typescript
app.get('/bids/opportunity/:id', ...)  // ✅ CORRECT
```

**Why?** When deployed as `make-server-8405be07`, the URL becomes:
- Wrong: `/functions/v1/make-server-8405be07/make-server-8405be07/...` (404)
- Right: `/functions/v1/make-server-8405be07/...` (200)

---

**Ready? Run one of the commands at the top!** 🚀
