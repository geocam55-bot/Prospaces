/**
 * Stripe Webhook Handler — processes Stripe events (payment confirmations, subscription updates, etc)
 *
 * Webhook Flow:
 *   1. Stripe sends HTTP POST to /webhooks/stripe with event + signature
 *   2. We validate signature using STRIPE_WEBHOOK_SECRET
 *   3. Process event based on type (payment_intent.succeeded, subscription updated, etc)
 *   4. Store billing events in KV or Supabase for audit trail
 *   5. Return 200 to acknowledge receipt
 *
 * Stripe Events to Handle:
 *   - payment_intent.succeeded — payment processed, update subscription to 'active'
 *   - payment_intent.payment_failed — payment failed, update to 'past_due'
 *   - customer.subscription.updated — subscription plan changed
 *   - customer.subscription.deleted — subscription canceled
 *   - invoice.payment_succeeded — recurring billing successful
 *   - invoice.payment_failed — recurring billing failed
 *   - charge.refunded — refund issued
 *
 * TODO: Implement webhook validation and event handlers (Phase 4)
 */

import { Hono } from 'npm:hono';
import { stripe } from './stripe-client.ts';

const PREFIX = '/make-server-8405be07';

export const webhooksAPI = new Hono();

/**
 * Ping endpoint — verify webhook endpoint is reachable
 */
webhooksAPI.get(`${PREFIX}/webhooks/stripe`, (c) => {
  return c.json({
    status: 'ok',
    message: 'Stripe webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Stripe Webhook Handler — POST /webhooks/stripe
 *
 * TODO: Implement webhook signature validation and event handlers
 */
webhooksAPI.post(`${PREFIX}/webhooks/stripe`, async (c) => {
  try {
    // Get raw body and signature from headers
    const signature = c.req.header('stripe-signature');
    if (!signature) {
      return c.json({ error: 'Missing stripe-signature header' }, 400);
    }

    const body = await c.req.text();

    // TODO: Implement webhook signature validation
    // const event = await stripe.webhooks.constructEvent(body, signature, webhookSecret);
    // if (!event) {
    //   return c.json({ error: 'Invalid signature' }, 401);
    // }

    // Placeholder: Log webhook event for debugging
    console.log('[Webhook] Received Stripe event (signature validation not yet implemented)');
    console.log('[Webhook] Signature:', signature.substring(0, 20) + '...');
    console.log('[Webhook] Body length:', body.length);

    // TODO: Implement event handlers by type
    // switch (event.type) {
    //   case 'payment_intent.succeeded':
    //     console.log('[Webhook] Payment succeeded:', event.data.object.id);
    //     // Update subscription to 'active'
    //     break;
    //   case 'payment_intent.payment_failed':
    //     console.log('[Webhook] Payment failed:', event.data.object.id);
    //     // Update subscription to 'past_due'
    //     break;
    //   case 'customer.subscription.updated':
    //     console.log('[Webhook] Subscription updated:', event.data.object.id);
    //     // Update subscription record in KV/DB
    //     break;
    //   case 'customer.subscription.deleted':
    //     console.log('[Webhook] Subscription deleted:', event.data.object.id);
    //     // Mark subscription as 'canceled'
    //     break;
    //   case 'invoice.payment_succeeded':
    //     console.log('[Webhook] Invoice paid:', event.data.object.id);
    //     // Log billing event
    //     break;
    //   default:
    //     console.log('[Webhook] Unhandled event type:', event.type);
    // }

    return c.json({ received: true }, 200);
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default webhooksAPI;
