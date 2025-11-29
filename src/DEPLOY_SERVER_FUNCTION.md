# Deploy Server Function to Fix Users API

The Users API endpoint was just added to the backend, but it needs to be deployed to Supabase to work.

## Quick Deploy

Run this command in your terminal:

```bash
supabase functions deploy server
```

This will deploy the updated server function with the new Users API endpoints.

## Verify Deployment

After deployment, check if it worked:

```bash
supabase functions list
```

You should see `server` in the list with a recent deployment time.

## What This Fixes

This deployment adds the following new endpoints to your backend:
- `GET /users` - List all users in organization
- `POST /users/invite` - Invite new users
- `PUT /users/:id` - Update user information
- `DELETE /users/:id` - Remove users

After deployment, refresh your ProSpaces CRM app and navigate to the Users page. It should now load successfully!
