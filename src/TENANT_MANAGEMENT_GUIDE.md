# 🏢 Tenant Organization Management Guide

## How to Access the Organizations Page

### Step 1: Login as Super Admin

The **Organizations** (Tenant Management) feature is **ONLY available to Super Admin users**.

**Option A: Quick Demo Button**
1. On the login page, click **"Quick Demo as Super Admin"**
2. This will automatically create and log you in as a Super Admin

**Option B: Manual Sign Up**
1. Click the **"Sign Up"** tab
2. Fill in your details
3. **IMPORTANT**: Select **"Super Admin (Full Access)"** from the Role dropdown
4. Click "Create Account"

### Step 2: Navigate to Organizations

Once logged in as Super Admin, you'll see the **"Organizations"** menu item in the left sidebar:

```
Dashboard
Contacts
Tasks
Appointments
Bids
Notes
Email
Marketing
Inventory
🏢 Organizations  ← Click here!
Users
🛡️ Security
Settings
```

### Step 3: Create Your First Organization

1. Click on **"Organizations"** in the sidebar
2. Click the **"Add Organization"** button (top right)
3. Fill in the organization details:
   - Organization Name (required)
   - Domain (optional)
   - Billing Email
   - Phone
   - Address
   - Select a Plan (Free/Starter/Professional/Enterprise)
   - Set user and contact limits
4. Click **"Create Organization"**

## What You Can Do

### Organization Dashboard
- View all tenant organizations
- See total organizations, active count, total users, and contacts
- Search organizations by name, domain, or email
- Filter by status (Active/Inactive/Suspended)

### Manage Organizations
- ✅ Create new tenant organizations
- ✅ Edit organization details and subscription plans
- ✅ Update status (Active/Inactive/Suspended)
- ✅ Set user and contact limits
- ✅ Delete organizations (with confirmation)

### Subscription Plans

**Free Plan**
- 5 users max
- 100 contacts max
- Basic features
- Email support

**Starter Plan**
- 10 users max
- 1,000 contacts max
- Standard features
- Email support
- Marketing automation

**Professional Plan**
- 50 users max
- 10,000 contacts max
- Advanced features
- Priority support
- Marketing automation
- Custom reports

**Enterprise Plan**
- Unlimited users
- Unlimited contacts
- All features
- 24/7 support
- Marketing automation
- Custom reports
- API access
- Dedicated account manager

## Role Permissions

| Role | Can Access Organizations? |
|------|---------------------------|
| **Super Admin** | ✅ Yes - Full access |
| Admin | ❌ No |
| Manager | ❌ No |
| Marketing | ❌ No |
| Standard User | ❌ No |

## Troubleshooting

### "I don't see the Organizations menu"

**Cause**: You're not logged in as a Super Admin

**Solution**: 
1. Log out
2. Click "Quick Demo as Super Admin" on login page
3. Or sign up with "Super Admin" role selected

### "Access Denied" message

**Cause**: Your account doesn't have Super Admin privileges

**Solution**: 
- Create a new account with Super Admin role
- Or ask your system administrator to upgrade your role

### "No Add Organization button"

**Cause**: You're not on the Organizations page or not logged in as Super Admin

**Solution**: 
1. Verify you're logged in as Super Admin (check badge in sidebar)
2. Click "Organizations" in the left sidebar
3. The button should appear in the top right

## Security Notes

- Only Super Admins can create, edit, or delete organizations
- All tenant operations are logged in the audit trail
- Each organization's data is completely isolated
- Deleting an organization affects all users in that organization

## Need Help?

If you're still having issues:
1. Check that you're logged in as **Super Admin** (role badge should say "SUPER ADMIN")
2. Look for the **"Organizations"** link in the left sidebar (has a building icon 🏢)
3. Click on it to see the Organizations page with the "Add Organization" button

---

**Remember**: Only users with the **Super Admin** role can access and manage tenant organizations. This is by design for security purposes.
