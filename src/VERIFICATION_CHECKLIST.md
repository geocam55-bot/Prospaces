# Deployment Verification Checklist

Use this checklist to ensure everything is working after deploying the backend fix.

## Pre-Deployment Checklist

- [ ] **Supabase CLI installed**
  ```bash
  supabase --version
  ```

- [ ] **Logged into Supabase**
  ```bash
  supabase login
  ```

- [ ] **Project linked**
  ```bash
  supabase link --project-ref usorqldwroecyxucmtuw
  ```

- [ ] **Routes fixed** (verify no occurrences):
  ```bash
  grep -c "'/make-server-8405be07/" supabase/functions/server/index.tsx
  # Should output: 0
  ```

## Deployment Checklist

- [ ] **Deploy command runs successfully**
  ```bash
  supabase functions deploy make-server-8405be07 --no-verify-jwt
  ```

- [ ] **No deployment errors** in terminal output

- [ ] **Function appears in Supabase Dashboard**
  - Visit: https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/functions
  - Should see `make-server-8405be07` listed

## Post-Deployment Verification

### Backend Endpoints

- [ ] **Health endpoint works**
  ```bash
  curl https://usorqldwroecyxucmtuw.supabase.co/functions/v1/make-server-8405be07/health
  ```
  Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Bids by opportunity endpoint** (requires auth token)
  - Check in browser DevTools → Network tab
  - Should return 200, not 404

- [ ] **Project managers by customer endpoint** (requires auth token)
  - Check in browser DevTools → Network tab
  - Should return 200, not 404

### Frontend Integration

- [ ] **No 404 errors in browser console**
  - Open app
  - Open DevTools → Console
  - Navigate to OpportunityDetail
  - Should NOT see:
    ```
    GET .../project-managers/customer/... 404
    GET .../bids/opportunity/... 404
    ```

- [ ] **"Fix Organization IDs" button works**
  - Click the button
  - Console should show successful API calls (200 status)
  - No errors about "backend not deployed"

- [ ] **Bids load correctly**
  - Navigate to an opportunity
  - Bids list should load
  - Kohltech Windows & Doors bid should appear after fix

### Console Messages

After deployment, you should see these messages (not the client-side fallback):

✅ **Good (Backend working):**
```
[loadData] Starting to load data for opportunity: ...
[backend response] Successfully loaded X bids
[backend response] Successfully loaded X project managers
```

❌ **Bad (Still using fallback):**
```
Using client-side bids by opportunity implementation (backend not deployed)
Using client-side project managers by customer implementation (backend not deployed)
```

## Data Verification

- [ ] **Organization IDs are correct**
  - All bids should have `organization_id: "org-1762906531790"`
  - Or NULL for legacy data

- [ ] **Bids filtered by opportunity**
  - Only bids with matching `opportunity_id` appear
  - No cross-contamination from other opportunities

- [ ] **Project managers filtered by customer**
  - Only project managers for the specific customer appear
  - No project managers from other customers

## Performance Check

- [ ] **Page load faster** (backend queries vs client-side filtering)
- [ ] **No lag** when clicking "Fix Organization IDs"
- [ ] **Smooth UI updates** when data loads

## Rollback Plan (If Something Goes Wrong)

If deployment fails or causes issues:

1. **Restore the backup** (if using fix-and-deploy.sh):
   ```bash
   mv supabase/functions/server/index.tsx.backup supabase/functions/server/index.tsx
   ```

2. **Or use git**:
   ```bash
   git checkout supabase/functions/server/index.tsx
   ```

3. **Frontend will continue using client-side fallback** (already working)

4. **Debug** using:
   - Supabase Dashboard → Functions → Logs
   - Browser DevTools → Network tab
   - `/DEPLOY_BACKEND.md` troubleshooting section

## Success Criteria

✅ All checkboxes above are checked  
✅ No 404 errors in console  
✅ Backend endpoints return 200 status  
✅ Bids and project managers load correctly  
✅ "Fix Organization IDs" button works without errors  
✅ Kohltech Windows & Doors bid appears in the correct opportunity  

## Need Help?

- **Deployment issues**: See `/DEPLOY_BACKEND.md`
- **Route fixing**: See `/ROUTE_FIXES_NEEDED.md`
- **Quick start**: See `/BACKEND_404_FIX_SUMMARY.md`
- **Automated fix**: Run `./fix-and-deploy.sh`

---

**Current Status:** ⏳ Awaiting deployment  
**Next Action:** Fix routes → Deploy → Verify using this checklist
