# Environment Variables Reference

## Stripe Configuration

Configure these variables in your `.env.local` (local development) or Vercel project settings (production).

### Required for Stripe Integration

```bash
# Stripe API credentials (from https://dashboard.stripe.com/apikeys)
STRIPE_API_KEY=sk_test_YOUR_SECRET_KEY_HERE  # or sk_live_* for production
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLIC_KEY_HERE  # Client-side visible (not used in Edge Functions)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE  # For webhook validation
```

### Feature Flags

```bash
# Enable Stripe API (disable to use KV fallback)
# Default: false (uses KV storage for demo/testing)
USE_STRIPE_API=false

# When to switch to true:
# - You have obtained Stripe API keys (from https://dashboard.stripe.com/apikeys)
# - You want to process real payments
# - You're ready to move past demo/KV mode
USE_STRIPE_API=true  # ONLY when keys are set above
```

## Existing System Configuration (Already Configured)

These are already set up in production but listed for reference:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_ANON_KEY=eyJhbGci...

# Email (system SMTP for billing notifications)
SUPPORT_EMAIL_ADDRESS=support@prospacescrm.ca
SUPPORT_EMAIL_NAME=ProSpaces CRM
SYSTEM_SMTP_HOST=smtp.ionos.com
SYSTEM_SMTP_PORT=587
SYSTEM_SMTP_SECURITY=tls
SYSTEM_SMTP_USERNAME=your-smtp-user
SYSTEM_SMTP_PASSWORD=your-smtp-password
```

## Vercel Environment Variables Setup

For production, add these to your Vercel project:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add for each environment (Development, Preview, Production):

```
STRIPE_API_KEY
STRIPE_PUBLISHABLE_KEY  (optional for Edge Functions, mainly for frontend)
STRIPE_WEBHOOK_SECRET
USE_STRIPE_API
```

**Important**: For Edge Functions, store `STRIPE_API_KEY` as a secret value.

## Local Development (.env.local)

Copy this template to `.env.local`:

```bash
# ─ Stripe Configuration ─────────────────────────
STRIPE_API_KEY=sk_test_YOUR_TEST_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_WEBHOOK_SECRET_HERE
USE_STRIPE_API=false  # Start with false while developing

# ─ System Configuration ────────────────────────
SUPPORT_EMAIL_ADDRESS=support@prospacescrm.ca
SUPPORT_EMAIL_NAME=ProSpaces CRM
SYSTEM_SMTP_HOST=smtp.ionos.com
SYSTEM_SMTP_PORT=587
SYSTEM_SMTP_SECURITY=tls
SYSTEM_SMTP_USERNAME=your-user
SYSTEM_SMTP_PASSWORD=your-password
```

## Testing Locally Without Stripe

To test locally without real Stripe:

1. Set `USE_STRIPE_API=false` (or omit it)
2. Omit `STRIPE_API_KEY`
3. The system will automatically fall back to KV storage (demo mode)
4. Billing still works, but payments are simulated

## Transitioning to Real Stripe

When you're ready to use real Stripe:

1. Get your API keys from https://dashboard.stripe.com/apikeys
2. Get your webhook secret from https://dashboard.stripe.com/webhooks
3. In `.env.local`, set:
   - `STRIPE_API_KEY=sk_test_...` (test) or `sk_live_...` (production)
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
   - `USE_STRIPE_API=true`
4. Test in local development first (test keys)
5. Deploy to Vercel with production keys (`sk_live_*`)

See [STRIPE_SETUP.md](./STRIPE_SETUP.md) for full instructions.
