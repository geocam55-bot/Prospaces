/**
 * Subscription Service — High-level business logic for subscription management.
 *
 * This module orchestrates:
 *   - Customer creation (Stripe API or KV, depending on config)
 *   - Subscription creation with trial/immediate billing
 *   - Plan changes (upgrades/downgrades)
 *   - Cancellations and reactivations
 *   - Payment method management
 *
 * Usage:
 *   import { subscriptionService } from './subscription-service.ts';
 *   const sub = await subscriptionService.createSubscription(orgId, userId, planId, ...);
 */

import { stripe } from './stripe-client.ts';
import * as kv from './kv_store.tsx';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';

export interface CreateSubscriptionParams {
  organizationId: string;
  userId: string;
  userEmail: string;
  planId: 'starter' | 'professional' | 'enterprise';
  billingInterval: 'month' | 'year';
  trialDays?: number;
  paymentMethodId?: string; // Stripe PM ID if using Stripe
}

export interface UpdateSubscriptionParams {
  subscriptionId: string;
  planId?: 'starter' | 'professional' | 'enterprise';
  billingInterval?: 'month' | 'year';
  paymentMethodId?: string;
}

export interface SubscriptionRecord {
  id: string;
  organization_id: string;
  user_id: string;
  plan_id: 'starter' | 'professional' | 'enterprise';
  status: SubscriptionStatus;
  billing_interval: 'month' | 'year';
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  amount: number;
  currency: string;
  payment_method_id?: string;
  storage_backend: 'kv' | 'stripe'; // Which system owns this subscription
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────

export const subscriptionService = {
  /**
   * Create a new subscription (with optional trial).
   * Automatically uses Stripe if configured, otherwise KV.
   */
  async create(params: CreateSubscriptionParams): Promise<SubscriptionRecord> {
    const now = new Date().toISOString();
    const currentTime = Math.floor(Date.now() / 1000);
    const trialDays = params.trialDays || 0;
    const periodEnd = new Date(
      Date.now() + (trialDays > 0 ? trialDays : 30) * 86400 * 1000
    ).toISOString();

    // Determine backend
    const stripeConfig = await stripe.customers.retrieve('dummy').catch(() => null);
    const useStripe = stripeConfig !== null;

    if (useStripe) {
      // ─ Stripe Flow ───────────────────────────────────────────────
      console.log('[Subscription] Creating subscription via Stripe...');

      // Step 1: Create or retrieve Stripe customer
      let customer = await stripe.customers.retrieve(
        `stripe_${params.organizationId}_${params.userId}`
      );
      if (!customer) {
        customer = await stripe.customers.create({
          email: params.userEmail,
          metadata: {
            organization_id: params.organizationId,
            user_id: params.userId,
          },
        });
      }

      // Step 2: Attach payment method if provided
      if (params.paymentMethodId) {
        await stripe.paymentMethods.attach(params.paymentMethodId, {
          customer: customer.id,
        });
      }

      // Step 3: Create Stripe subscription
      const stripeSubscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [
          {
            price: `price_${params.planId}_${params.billingInterval}`, // Stripe price ID format
          },
        ],
        trial_period_days: trialDays > 0 ? trialDays : undefined,
        metadata: {
          organization_id: params.organizationId,
          user_id: params.userId,
          plan_id: params.planId,
        },
      });

      // Step 4: Store in KV for local caching
      const subscriptionKey = `subscription:${params.organizationId}:${params.userId}`;
      const record: SubscriptionRecord = {
        id: stripeSubscription.id,
        organization_id: params.organizationId,
        user_id: params.userId,
        plan_id: params.planId,
        status: stripeSubscription.status as SubscriptionStatus,
        billing_interval: params.billingInterval,
        current_period_start: new Date(
          stripeSubscription.current_period_start * 1000
        ).toISOString(),
        current_period_end: new Date(
          stripeSubscription.current_period_end * 1000
        ).toISOString(),
        trial_end: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000).toISOString()
          : undefined,
        cancel_at_period_end: false,
        amount: 0, // Will be filled from Stripe price
        currency: 'USD',
        storage_backend: 'stripe',
        stripe_customer_id: customer.id,
        stripe_subscription_id: stripeSubscription.id,
        created_at: now,
        updated_at: now,
      };

      await kv.set(subscriptionKey, JSON.stringify(record));
      return record;
    } else {
      // ─ KV Fallback ───────────────────────────────────────────────
      console.log('[Subscription] Creating subscription via KV fallback...');

      const subscriptionId = `sub_kv_${Math.random().toString(36).slice(2).substring(0, 12)}`;
      const subscriptionKey = `subscription:${params.organizationId}:${params.userId}`;

      const record: SubscriptionRecord = {
        id: subscriptionId,
        organization_id: params.organizationId,
        user_id: params.userId,
        plan_id: params.planId,
        status: trialDays > 0 ? 'trialing' : 'active',
        billing_interval: params.billingInterval,
        current_period_start: now,
        current_period_end: periodEnd,
        trial_end: trialDays > 0 ? periodEnd : undefined,
        cancel_at_period_end: false,
        amount: getPriceForPlan(params.planId),
        currency: 'USD',
        payment_method_id: params.paymentMethodId,
        storage_backend: 'kv',
        created_at: now,
        updated_at: now,
      };

      await kv.set(subscriptionKey, JSON.stringify(record));
      return record;
    }
  },

  /**
   * Retrieve a subscription by ID.
   */
  async get(subscriptionId: string): Promise<SubscriptionRecord | null> {
    // First check KV cache
    const cached = await kv.get<SubscriptionRecord>(
      `subscription_by_id:${subscriptionId}`
    );
    if (cached) return cached;

    // If using Stripe, fetch from Stripe
    if (subscriptionId.startsWith('sub_')) {
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (stripeSubscription) {
        // Convert to local format and cache
        const record: SubscriptionRecord = {
          id: stripeSubscription.id,
          organization_id: stripeSubscription.metadata?.organization_id || '',
          user_id: stripeSubscription.metadata?.user_id || '',
          plan_id: (stripeSubscription.metadata?.plan_id as any) || 'starter',
          status: stripeSubscription.status as SubscriptionStatus,
          billing_interval: 'month',
          current_period_start: new Date(
            stripeSubscription.current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            stripeSubscription.current_period_end * 1000
          ).toISOString(),
          trial_end: stripeSubscription.trial_end
            ? new Date(stripeSubscription.trial_end * 1000).toISOString()
            : undefined,
          cancel_at_period_end: false,
          amount: 0,
          currency: 'USD',
          storage_backend: 'stripe',
          stripe_subscription_id: stripeSubscription.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await kv.set(`subscription_by_id:${subscriptionId}`, JSON.stringify(record));
        return record;
      }
    }

    return null;
  },

  /**
   * Get user's current subscription.
   */
  async getCurrent(organizationId: string, userId: string): Promise<SubscriptionRecord | null> {
    const key = `subscription:${organizationId}:${userId}`;
    const data = await kv.get<SubscriptionRecord>(key);
    return data || null;
  },

  /**
   * Update subscription (plan change, billing interval, etc).
   */
  async update(
    subscriptionId: string,
    params: UpdateSubscriptionParams
  ): Promise<SubscriptionRecord> {
    const existing = await this.get(subscriptionId);
    if (!existing) throw new Error('Subscription not found');

    if (existing.storage_backend === 'stripe' && existing.stripe_subscription_id) {
      // Update via Stripe
      console.log('[Subscription] Updating subscription via Stripe...');
      // TODO: Implement Stripe subscription.update()
    } else {
      // Update via KV
      console.log('[Subscription] Updating subscription via KV...');
      const updated: SubscriptionRecord = {
        ...existing,
        plan_id: params.planId || existing.plan_id,
        billing_interval: params.billingInterval || existing.billing_interval,
        updated_at: new Date().toISOString(),
      };
      const key = `subscription:${existing.organization_id}:${existing.user_id}`;
      await kv.set(key, JSON.stringify(updated));
      return updated;
    }

    return existing;
  },

  /**
   * Cancel a subscription (immediately or at period end).
   */
  async cancel(
    subscriptionId: string,
    opts?: { atPeriodEnd?: boolean }
  ): Promise<SubscriptionRecord> {
    const existing = await this.get(subscriptionId);
    if (!existing) throw new Error('Subscription not found');

    if (existing.storage_backend === 'stripe' && existing.stripe_subscription_id) {
      // Cancel via Stripe
      console.log('[Subscription] Canceling subscription via Stripe...');
      // TODO: Implement Stripe subscription.cancel()
    } else {
      // Cancel via KV
      console.log('[Subscription] Canceling subscription via KV...');
      const updated: SubscriptionRecord = {
        ...existing,
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancel_at_period_end: opts?.atPeriodEnd || false,
        updated_at: new Date().toISOString(),
      };
      const key = `subscription:${existing.organization_id}:${existing.user_id}`;
      await kv.set(key, JSON.stringify(updated));
      return updated;
    }

    return existing;
  },

  /**
   * Reactivate a canceled subscription.
   */
  async reactivate(subscriptionId: string): Promise<SubscriptionRecord> {
    const existing = await this.get(subscriptionId);
    if (!existing) throw new Error('Subscription not found');

    // Update status to 'active'
    const updated: SubscriptionRecord = {
      ...existing,
      status: 'active',
      canceled_at: undefined,
      updated_at: new Date().toISOString(),
    };

    const key = `subscription:${existing.organization_id}:${existing.user_id}`;
    await kv.set(key, JSON.stringify(updated));
    return updated;
  },
};

// ─────────────────────────────────────────────────────────────────────────

function getPriceForPlan(planId: string): number {
  const prices: Record<string, number> = {
    starter: 29,
    professional: 79,
    enterprise: 199,
  };
  return prices[planId] || 0;
}
