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
import * as kv from './kv_store.tsx';

const PREFIX = '/make-server-8405be07';

export const webhooksAPI = new Hono();

type LocalSubscription = {
  id: string;
  organization_id: string;
  user_id: string;
  plan_id: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  billing_interval: 'month' | 'year';
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  amount: number;
  currency: string;
  payment_method_id?: string;
  storage_backend?: 'kv' | 'stripe';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at: string;
};

type BillingEvent = {
  id: string;
  organization_id: string;
  type: 'payment' | 'refund' | 'credit' | 'plan_change' | 'subscription_created' | 'subscription_canceled' | 'trial_started';
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  description: string;
  plan_id?: 'starter' | 'professional' | 'enterprise';
  invoice_number?: string;
  support_email?: string;
  created_at: string;
};

const DEFAULT_BILLING_SUPPORT_EMAIL = 'support@prospacescrm.ca';

function asIso(epochSeconds?: number | null): string | undefined {
  if (!epochSeconds || !Number.isFinite(epochSeconds)) return undefined;
  return new Date(epochSeconds * 1000).toISOString();
}

async function listAllSubscriptions(): Promise<LocalSubscription[]> {
  const subs = await kv.getByPrefix('subscription:');
  return Array.isArray(subs) ? subs : [];
}

async function findSubscriptionByStripeSubscriptionId(stripeSubscriptionId: string): Promise<LocalSubscription | null> {
  const subs = await listAllSubscriptions();
  const found = subs.find((sub: LocalSubscription) => {
    return sub?.stripe_subscription_id === stripeSubscriptionId || sub?.id === stripeSubscriptionId;
  });
  return found || null;
}

async function findSubscriptionByStripeCustomerId(stripeCustomerId: string): Promise<LocalSubscription | null> {
  const subs = await listAllSubscriptions();
  const found = subs.find((sub: LocalSubscription) => sub?.stripe_customer_id === stripeCustomerId);
  return found || null;
}

async function persistSubscription(sub: LocalSubscription): Promise<void> {
  await kv.set(`subscription:${sub.organization_id}:${sub.user_id}`, {
    ...sub,
    updated_at: new Date().toISOString(),
  });
}

async function writeBillingEvent(event: BillingEvent): Promise<void> {
  await kv.set(`billing_event:${event.organization_id}:${event.id}`, event);
}

function toBillingStatus(status: string): 'succeeded' | 'failed' | 'pending' | 'refunded' {
  if (status === 'paid' || status === 'succeeded') return 'succeeded';
  if (status === 'refunded') return 'refunded';
  if (status === 'failed' || status === 'uncollectible') return 'failed';
  return 'pending';
}

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
    const webhookSecret = (Deno.env.get('STRIPE_WEBHOOK_SECRET') || '').trim();
    if (!webhookSecret) {
      return c.json({ error: 'Stripe webhook secret not configured' }, 500);
    }

    const event = await stripe.webhooks.constructEvent(body, signature, webhookSecret);
    if (!event) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const nowIso = new Date().toISOString();
    const supportEmail = (Deno.env.get('SUPPORT_EMAIL_ADDRESS') || DEFAULT_BILLING_SUPPORT_EMAIL).trim();

    console.log('[Webhook] Event received:', event.type, event.id);

    switch (event.type) {
      case 'customer.subscription.updated': {
        const subObj = event.data.object as any;
        const local = await findSubscriptionByStripeSubscriptionId(subObj.id);
        if (!local) break;

        const next: LocalSubscription = {
          ...local,
          status: subObj.status === 'past_due' ? 'past_due' : subObj.status === 'canceled' ? 'canceled' : subObj.status === 'trialing' ? 'trialing' : 'active',
          current_period_start: asIso(subObj.current_period_start) || local.current_period_start,
          current_period_end: asIso(subObj.current_period_end) || local.current_period_end,
          trial_end: asIso(subObj.trial_end),
          cancel_at_period_end: !!subObj.cancel_at_period_end,
          canceled_at: asIso(subObj.canceled_at),
          stripe_customer_id: typeof subObj.customer === 'string' ? subObj.customer : subObj.customer?.id,
          stripe_subscription_id: subObj.id,
        };
        await persistSubscription(next);

        await writeBillingEvent({
          id: crypto.randomUUID(),
          organization_id: next.organization_id,
          type: 'plan_change',
          amount: next.amount,
          currency: next.currency || 'USD',
          status: 'succeeded',
          description: `Stripe subscription updated (${subObj.id})`,
          plan_id: next.plan_id,
          support_email: supportEmail,
          created_at: nowIso,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subObj = event.data.object as any;
        const local = await findSubscriptionByStripeSubscriptionId(subObj.id);
        if (!local) break;

        const next: LocalSubscription = {
          ...local,
          status: 'canceled',
          cancel_at_period_end: false,
          canceled_at: asIso(subObj.canceled_at) || nowIso,
          stripe_subscription_id: subObj.id,
        };
        await persistSubscription(next);

        await writeBillingEvent({
          id: crypto.randomUUID(),
          organization_id: next.organization_id,
          type: 'subscription_canceled',
          amount: 0,
          currency: next.currency || 'USD',
          status: 'succeeded',
          description: `Stripe subscription canceled (${subObj.id})`,
          plan_id: next.plan_id,
          support_email: supportEmail,
          created_at: nowIso,
        });
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        const stripeSubId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

        let local = stripeSubId
          ? await findSubscriptionByStripeSubscriptionId(stripeSubId)
          : null;
        if (!local && stripeCustomerId) {
          local = await findSubscriptionByStripeCustomerId(stripeCustomerId);
        }
        if (!local) break;

        if (event.type === 'invoice.payment_succeeded') {
          local.status = 'active';
        } else {
          local.status = 'past_due';
        }
        await persistSubscription(local);

        await writeBillingEvent({
          id: crypto.randomUUID(),
          organization_id: local.organization_id,
          type: 'payment',
          amount: ((invoice.amount_paid ?? invoice.amount_due ?? 0) / 100),
          currency: (invoice.currency || local.currency || 'usd').toUpperCase(),
          status: event.type === 'invoice.payment_succeeded' ? 'succeeded' : 'failed',
          description: event.type === 'invoice.payment_succeeded'
            ? `Stripe invoice paid (${invoice.id})`
            : `Stripe invoice payment failed (${invoice.id})`,
          plan_id: local.plan_id,
          invoice_number: invoice.number || undefined,
          support_email: supportEmail,
          created_at: asIso(invoice.created) || nowIso,
        });
        break;
      }

      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;
        const stripeCustomerId = typeof paymentIntent.customer === 'string'
          ? paymentIntent.customer
          : paymentIntent.customer?.id;
        if (!stripeCustomerId) break;

        const local = await findSubscriptionByStripeCustomerId(stripeCustomerId);
        if (!local) break;

        local.status = event.type === 'payment_intent.succeeded' ? 'active' : 'past_due';
        await persistSubscription(local);

        await writeBillingEvent({
          id: crypto.randomUUID(),
          organization_id: local.organization_id,
          type: 'payment',
          amount: (paymentIntent.amount || 0) / 100,
          currency: (paymentIntent.currency || local.currency || 'usd').toUpperCase(),
          status: event.type === 'payment_intent.succeeded' ? 'succeeded' : 'failed',
          description: `Stripe payment intent ${event.type === 'payment_intent.succeeded' ? 'succeeded' : 'failed'} (${paymentIntent.id})`,
          plan_id: local.plan_id,
          support_email: supportEmail,
          created_at: asIso(paymentIntent.created) || nowIso,
        });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as any;
        const stripeCustomerId = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id;
        if (!stripeCustomerId) break;

        const local = await findSubscriptionByStripeCustomerId(stripeCustomerId);
        if (!local) break;

        await writeBillingEvent({
          id: crypto.randomUUID(),
          organization_id: local.organization_id,
          type: 'refund',
          amount: ((charge.amount_refunded || 0) / 100),
          currency: (charge.currency || local.currency || 'usd').toUpperCase(),
          status: 'refunded',
          description: `Stripe charge refunded (${charge.id})`,
          plan_id: local.plan_id,
          support_email: supportEmail,
          created_at: asIso(charge.created) || nowIso,
        });
        break;
      }

      default:
        console.log('[Webhook] Unhandled event type:', event.type);
    }

    return c.json({ received: true, type: event.type }, 200);
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default webhooksAPI;
