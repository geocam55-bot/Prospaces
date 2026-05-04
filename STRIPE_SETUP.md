# Stripe Integration Setup Guide

## Prerequisites: Get Your Stripe API Keys

1. **Create a Stripe Account** (if you don't have one):
   - Go to https://dashboard.stripe.com/register
   - Sign up with your email

2. **Get Test Mode Keys**:
   - Go to https://dashboard.stripe.com/apikeys
   - You'll see two keys under "Test data":
     - **Publishable Key** (starts with `pk_test_`)
     - **Secret Key** (starts with `sk_test_`)
   - Copy both

3. **Get a Webhook Signing Secret** (for later, when implementing webhooks):
   - Go to https://dashboard.stripe.com/webhooks
   - Create a new endpoint (point to your Vercel/Netlify production URL + `/functions/v1/make-server-8405be07/webhooks/stripe`)
   - Copy the "Signing secret" (starts with `whsec_`)

## Local Environment Setup

Create or update your `.env.local` file with:

```bash
# Stripe API Configuration
STRIPE_API_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Stripe feature flag (toggle between KV and Stripe)
# Remove or set to "false" to use KV; set to "true" to use Stripe API
USE_STRIPE_API=false
```

## Vercel Environment Setup

1. Go to your Vercel Project Settings → Environment Variables
2. Add the three variables above as production/preview/development secrets
3. **Important**: Use only the `STRIPE_API_KEY` for Supabase Edge Functions (it doesn't support browser-exposed keys)

## Production Readiness Checklist

- [ ] Get Stripe keys from https://dashboard.stripe.com/apikeys
- [ ] Set `USE_STRIPE_API=true` once ready to accept real payments
- [ ] Create webhook endpoint in Stripe dashboard
- [ ] Add STRIPE_WEBHOOK_SECRET to environment
- [ ] Test payment flow in test mode first
- [ ] Switch to live keys (pk_live_*, sk_live_*) only when ready for production

## Testing with Stripe Test Cards

Once integrated, use these card numbers for testing:

**Success**:
- `4242 4242 4242 4242` — succeeds
- `4000 0000 0000 0002` — declines

**Expiry**: Any future date (e.g., 12/30)
**CVV**: Any 3 digits (e.g., 123)

See all test cards: https://stripe.com/docs/testing

## Next Steps

The codebase now includes Stripe scaffolding with a fallback to KV. Once you add your keys:

1. Update `.env.local` with your test keys
2. Set `USE_STRIPE_API=true` to enable Stripe API calls
3. Test the subscription flow locally
4. Deploy to Vercel with production secrets
