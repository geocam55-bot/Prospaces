# Backend Route Fixes Needed

## Problem
All 49 routes in `/supabase/functions/server/index.tsx` have an incorrect `/make-server-8405be07/` prefix.

## What Needs to Change

### Example 1: Auth Routes
```typescript
// ❌ WRONG (Current)
app.post('/make-server-8405be07/auth/signup', async (c) => {

// ✅ CORRECT (Should be)
app.post('/auth/signup', async (c) => {
```

### Example 2: Bids by Opportunity (404 Error #1)
```typescript
// ❌ WRONG (Current - Line 626)
app.get('/make-server-8405be07/bids/opportunity/:opportunityId', async (c) => {

// ✅ CORRECT (Should be)
app.get('/bids/opportunity/:opportunityId', async (c) => {
```

### Example 3: Project Managers by Customer (404 Error #2)
```typescript
// ❌ WRONG (Current - Line 1808)
app.get('/make-server-8405be07/project-managers/customer/:customerId', async (c) => {

// ✅ CORRECT (Should be)
app.get('/project-managers/customer/:customerId', async (c) => {
```

## Complete List of Routes to Fix

All of these need `/make-server-8405be07` removed:

### AUTH (4 routes)
- Line 46: `/make-server-8405be07/auth/signup` → `/auth/signup`
- Line 89: `/make-server-8405be07/auth/signin` → `/auth/signin`
- Line 122: `/make-server-8405be07/auth/signout` → `/auth/signout`
- Line 145: `/make-server-8405be07/auth/session` → `/auth/session`

### CONTACTS (4 routes)
- Line 176: `/make-server-8405be07/contacts` → `/contacts`
- Line 197: `/make-server-8405be07/contacts` → `/contacts`
- Line 230: `/make-server-8405be07/contacts/:id` → `/contacts/:id`
- Line 265: `/make-server-8405be07/contacts/:id` → `/contacts/:id`

### TASKS (4 routes)
- Line 291: `/make-server-8405be07/tasks` → `/tasks`
- Line 312: `/make-server-8405be07/tasks` → `/tasks`
- Line 345: `/make-server-8405be07/tasks/:id` → `/tasks/:id`
- Line 380: `/make-server-8405be07/tasks/:id` → `/tasks/:id`

### APPOINTMENTS (3 routes)
- Line 406: `/make-server-8405be07/appointments` → `/appointments`
- Line 427: `/make-server-8405be07/appointments` → `/appointments`
- Line 460: `/make-server-8405be07/appointments/:id` → `/appointments/:id`

### BIDS (5 routes) **← CRITICAL FOR FIXING 404**
- Line 486: `/make-server-8405be07/bids` → `/bids`
- Line 507: `/make-server-8405be07/bids` → `/bids`
- Line 554: `/make-server-8405be07/bids/:id` → `/bids/:id`
- Line 603: `/make-server-8405be07/bids/:id` → `/bids/:id`
- Line 626: `/make-server-8405be07/bids/opportunity/:opportunityId` → `/bids/opportunity/:opportunityId` **← 404 ERROR**

### NOTES (3 routes)
- Line 654: `/make-server-8405be07/notes` → `/notes`
- Line 675: `/make-server-8405be07/notes` → `/notes`
- Line 708: `/make-server-8405be07/notes/:id` → `/notes/:id`

### SECURITY (3 routes)
- Line 734: `/make-server-8405be07/security/permissions` → `/security/permissions`
- Line 763: `/make-server-8405be07/security/permissions` → `/security/permissions`
- Line 819: `/make-server-8405be07/security/audit-logs` → `/security/audit-logs`

### EMAIL (6 routes)
- Line 858: `/make-server-8405be07/email/accounts` → `/email/accounts`
- Line 901: `/make-server-8405be07/email/accounts` → `/email/accounts`
- Line 952: `/make-server-8405be07/email/accounts/:id` → `/email/accounts/:id`
- Line 1000: `/make-server-8405be07/email/emails` → `/email/emails`
- Line 1033: `/make-server-8405be07/email/emails` → `/email/emails`
- Line 1083: `/make-server-8405be07/email/emails/:id` → `/email/emails/:id`
- Line 1124: `/make-server-8405be07/email/emails/:id` → `/email/emails/:id`
- Line 1153: `/make-server-8405be07/email/accounts/:id/sync` → `/email/accounts/:id/sync`

### INVENTORY (4 routes)
- Line 1197: `/make-server-8405be07/inventory` → `/inventory`
- Line 1219: `/make-server-8405be07/inventory` → `/inventory`
- Line 1263: `/make-server-8405be07/inventory/:id` → `/inventory/:id`
- Line 1312: `/make-server-8405be07/inventory/:id` → `/inventory/:id`

### TENANTS (5 routes)
- Line 1353: `/make-server-8405be07/tenants/current` → `/tenants/current`
- Line 1382: `/make-server-8405be07/tenants` → `/tenants`
- Line 1408: `/make-server-8405be07/tenants` → `/tenants`
- Line 1457: `/make-server-8405be07/tenants/:id` → `/tenants/:id`
- Line 1510: `/make-server-8405be07/tenants/:id` → `/tenants/:id`

### USERS (4 routes)
- Line 1559: `/make-server-8405be07/users` → `/users`
- Line 1614: `/make-server-8405be07/users/invite` → `/users/invite`
- Line 1688: `/make-server-8405be07/users/:id` → `/users/:id`
- Line 1742: `/make-server-8405be07/users/:id` → `/users/:id`

### PROJECT MANAGERS (1 route) **← CRITICAL FOR FIXING 404**
- Line 1808: `/make-server-8405be07/project-managers/customer/:customerId` → `/project-managers/customer/:customerId` **← 404 ERROR**

### HEALTH CHECK (1 route)
- Line 1833: `/make-server-8405be07/health` → `/health`

## Total: 49 routes need to be fixed

## How to Apply

### Option 1: Use the fix-and-deploy.sh script
```bash
chmod +x fix-and-deploy.sh
./fix-and-deploy.sh
```

### Option 2: Use sed command
**macOS:**
```bash
sed -i '' "s/app\.\(get\|post\|put\|delete\)('\/make-server-8405be07\//app.\1('\//g" supabase/functions/server/index.tsx
```

**Linux:**
```bash
sed -i "s/app\.\(get\|post\|put\|delete\)('\/make-server-8405be07\//app.\1('\//g" supabase/functions/server/index.tsx
```

### Option 3: Find & Replace in your editor
1. Open `supabase/functions/server/index.tsx`
2. Use Find & Replace (Cmd/Ctrl + H)
3. **Find:** `('/make-server-8405be07/`
4. **Replace with:** `('/`
5. Replace all (should be 49 replacements)
6. Save the file

## Verification
After fixing, run this to confirm all routes are fixed:
```bash
grep -c "'/make-server-8405be07/" supabase/functions/server/index.tsx
```

This should return `0` (zero occurrences).

## Next Steps
After fixing the routes, deploy the function:
```bash
supabase functions deploy make-server-8405be07 --no-verify-jwt
```
