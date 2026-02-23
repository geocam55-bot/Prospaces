import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { extractUserToken } from './auth-helper.ts';

/**
 * Subscription & Billing routes (KV-backed).
 *
 * Key patterns:
 *   subscription:{orgId}              — current subscription record
 *   billing_event:{orgId}:{eventId}   — individual billing/payment events
 *   payment_method:{orgId}            — stored payment method (demo/tokenised)
 */

const PREFIX = '/make-server-8405be07';

// ── Plan definitions (demonstration pricing) ────────────────────────────
export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    priceAnnual: 290, // ~17% savings
    currency: 'USD',
    interval: 'month',
    features: [
      'Core CRM (Contacts, Deals, Tasks)',
      'Email integration',
      'Basic reports',
      'Community support',
    ],
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 79,
    priceAnnual: 790,
    currency: 'USD',
    interval: 'month',
    features: [
      'Everything in Starter',
      'Marketing automation',
      'Inventory management',
      'Document management',
      'Project Wizards (3D planners)',
      'Advanced reports & analytics',
      'Customer portal',
      'Email support',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    priceAnnual: 1990,
    currency: 'USD',
    interval: 'month',
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'Custom integrations',
      'SSO / SAML support',
      'Audit log',
      'Priority support (24/7)',
      'API access',
      'Custom onboarding',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: PlanId;
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
  seat_count?: number;
  price_per_seat?: number;
  created_at: string;
  updated_at: string;
}

export interface BillingEvent {
  id: string;
  organization_id: string;
  type: 'payment' | 'refund' | 'credit' | 'plan_change' | 'subscription_created' | 'subscription_canceled' | 'trial_started';
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  description: string;
  plan_id?: PlanId;
  invoice_number?: string;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  organization_id: string;
  type: 'card';
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  created_at: string;
}

// ── Helper: authenticate and resolve org ────────────────────────────────
async function authenticateAndGetOrg(c: any): Promise<{
  userId: string;
  orgId: string;
  role: string;
} | null> {
  const accessToken = extractUserToken(c);
  if (!accessToken) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  const orgId = profile?.organization_id || user.user_metadata?.organizationId;
  if (!orgId) return null;

  return { userId: user.id, orgId, role: profile?.role || 'standard_user' };
}

// ── Helper: generate invoice number ─────────────────────────────────────
function generateInvoiceNumber(): string {
  const prefix = 'PS';
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${y}${m}-${seq}`;
}

// ── Helper: count active users in an organization ───────────────────────
async function countActiveSeats(orgId: string): Promise<number> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'active');
  if (error) {
    console.error('[subscriptions] Error counting active seats:', error);
    return 1; // Fallback to at least 1 seat
  }
  return Math.max(1, count ?? 1); // Ensure at least 1
}

// ── Helper: resolve per-seat price from plan (checks admin config) ──────
async function resolvePerSeatPrice(planId: PlanId, interval: 'month' | 'year'): Promise<number> {
  const defaultPlan = PLANS[planId];
  try {
    const customConfig: any = await kv.get('billing_plan_config:global');
    if (customConfig?.plans?.[planId]) {
      const custom = customConfig.plans[planId];
      return interval === 'year'
        ? (custom.priceAnnual ?? defaultPlan.priceAnnual)
        : (custom.price ?? defaultPlan.price);
    }
  } catch { /* ignore */ }
  return interval === 'year' ? defaultPlan.priceAnnual : defaultPlan.price;
}

// ── Register routes ─────────────────────────────────────────────────────
export function subscriptions(app: Hono) {

  // GET /subscriptions/plans — public, no auth required
  app.get(`${PREFIX}/subscriptions/plans`, async (c) => {
    try {
      // Check for custom plan config in KV
      const customConfig: any = await kv.get('billing_plan_config:global');
      if (customConfig?.plans) {
        // Merge custom config over defaults
        const mergedPlans: Record<string, any> = {};
        for (const [key, defaultPlan] of Object.entries(PLANS)) {
          const custom = customConfig.plans[key];
          if (custom) {
            mergedPlans[key] = { ...defaultPlan, ...custom, id: key };
          } else {
            mergedPlans[key] = { ...defaultPlan };
          }
        }
        return c.json({ plans: mergedPlans });
      }
      return c.json({ plans: PLANS });
    } catch (error: any) {
      console.error('[subscriptions] Error fetching plans:', error);
      return c.json({ plans: PLANS });
    }
  });

  // GET /subscriptions/current — get org's active subscription
  app.get(`${PREFIX}/subscriptions/current`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const sub: Subscription | null = await kv.get(`subscription:${auth.orgId}`);

      // If subscription exists, check if it's expired
      if (sub && sub.status === 'active' && new Date(sub.current_period_end) < new Date()) {
        sub.status = 'expired';
        await kv.set(`subscription:${auth.orgId}`, sub);
      }

      return c.json({ subscription: sub || null });
    } catch (error: any) {
      console.error('[subscriptions] Error fetching subscription:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /subscriptions/create — create a new subscription (demo: instant activation)
  app.post(`${PREFIX}/subscriptions/create`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      // Only admins can manage subscriptions
      if (!['admin', 'super_admin'].includes(auth.role)) {
        return c.json({ error: 'Only admins can manage subscriptions' }, 403);
      }

      const body = await c.req.json();
      const { plan_id, billing_interval = 'month', payment_method, trial } = body;

      if (!plan_id || !PLANS[plan_id as PlanId]) {
        return c.json({ error: 'Invalid plan_id' }, 400);
      }

      const plan = PLANS[plan_id as PlanId];
      const now = new Date();
      const periodStart = now.toISOString();
      let periodEnd: string;
      let status: Subscription['status'] = 'active';
      let trialEnd: string | undefined;

      if (trial) {
        // 14-day free trial
        const trialEndDate = new Date(now);
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        trialEnd = trialEndDate.toISOString();
        periodEnd = trialEnd;
        status = 'trialing';
      } else if (billing_interval === 'year') {
        const end = new Date(now);
        end.setFullYear(end.getFullYear() + 1);
        periodEnd = end.toISOString();
      } else {
        const end = new Date(now);
        end.setMonth(end.getMonth() + 1);
        periodEnd = end.toISOString();
      }

      const amount = billing_interval === 'year' ? plan.priceAnnual : plan.price;

      // Count active seats for per-seat billing
      const seatCount = await countActiveSeats(auth.orgId);
      const perSeatPrice = await resolvePerSeatPrice(plan_id as PlanId, billing_interval);
      const totalAmount = Math.round(perSeatPrice * seatCount * 100) / 100;

      const subId = crypto.randomUUID();
      const subscription: Subscription = {
        id: subId,
        organization_id: auth.orgId,
        plan_id: plan_id as PlanId,
        status,
        billing_interval,
        current_period_start: periodStart,
        current_period_end: periodEnd!,
        trial_end: trialEnd,
        cancel_at_period_end: false,
        amount: totalAmount,
        currency: plan.currency,
        seat_count: seatCount,
        price_per_seat: perSeatPrice,
        created_at: periodStart,
        updated_at: periodStart,
      };

      // Store payment method if provided
      if (payment_method) {
        const pmId = crypto.randomUUID();
        const pm: PaymentMethod = {
          id: pmId,
          organization_id: auth.orgId,
          type: 'card',
          brand: payment_method.brand || 'Visa',
          last4: payment_method.last4 || '4242',
          exp_month: payment_method.exp_month || 12,
          exp_year: payment_method.exp_year || 2028,
          is_default: true,
          created_at: periodStart,
        };
        await kv.set(`payment_method:${auth.orgId}`, pm);
        subscription.payment_method_id = pmId;
      }

      await kv.set(`subscription:${auth.orgId}`, subscription);

      // Create billing event
      const eventId = crypto.randomUUID();
      const event: BillingEvent = {
        id: eventId,
        organization_id: auth.orgId,
        type: trial ? 'trial_started' : 'subscription_created',
        amount: trial ? 0 : totalAmount,
        currency: plan.currency,
        status: 'succeeded',
        description: trial
          ? `Started 14-day free trial of ${plan.name} plan (${seatCount} seat${seatCount !== 1 ? 's' : ''})`
          : `Subscribed to ${plan.name} plan (${billing_interval}ly) — ${seatCount} seat${seatCount !== 1 ? 's' : ''}`,
        plan_id: plan_id as PlanId,
        invoice_number: trial ? undefined : generateInvoiceNumber(),
        created_at: periodStart,
      };
      await kv.set(`billing_event:${auth.orgId}:${eventId}`, event);

      // If not a trial, simulate payment event
      if (!trial) {
        const paymentId = crypto.randomUUID();
        const paymentEvent: BillingEvent = {
          id: paymentId,
          organization_id: auth.orgId,
          type: 'payment',
          amount: totalAmount,
          currency: plan.currency,
          status: 'succeeded',
          description: `Payment for ${plan.name} plan — ${billing_interval === 'year' ? 'annual' : 'monthly'} billing (${seatCount} seat${seatCount !== 1 ? 's' : ''})`,
          plan_id: plan_id as PlanId,
          invoice_number: generateInvoiceNumber(),
          created_at: periodStart,
        };
        await kv.set(`billing_event:${auth.orgId}:${paymentId}`, paymentEvent);
      }

      console.log(`[subscriptions] Created ${status} subscription for org ${auth.orgId}: ${plan_id} (${billing_interval})`);
      return c.json({ subscription });
    } catch (error: any) {
      console.error('[subscriptions] Error creating subscription:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // PUT /subscriptions/update — change plan (upgrade/downgrade)
  app.put(`${PREFIX}/subscriptions/update`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      if (!['admin', 'super_admin'].includes(auth.role)) {
        return c.json({ error: 'Only admins can manage subscriptions' }, 403);
      }

      const body = await c.req.json();
      const { plan_id, billing_interval } = body;

      const existing: Subscription | null = await kv.get(`subscription:${auth.orgId}`);
      if (!existing) {
        return c.json({ error: 'No active subscription found' }, 404);
      }

      if (plan_id && !PLANS[plan_id as PlanId]) {
        return c.json({ error: 'Invalid plan_id' }, 400);
      }

      const now = new Date().toISOString();
      const newPlanId = (plan_id || existing.plan_id) as PlanId;
      const newInterval = billing_interval || existing.billing_interval;
      const plan = PLANS[newPlanId];
      const newAmount = newInterval === 'year' ? plan.priceAnnual : plan.price;
      const oldPlan = PLANS[existing.plan_id];

      // Recalculate period end if interval changed
      let periodEnd = existing.current_period_end;
      if (billing_interval && billing_interval !== existing.billing_interval) {
        const end = new Date();
        if (billing_interval === 'year') {
          end.setFullYear(end.getFullYear() + 1);
        } else {
          end.setMonth(end.getMonth() + 1);
        }
        periodEnd = end.toISOString();
      }

      // Recalculate per-seat billing
      const seatCount = existing.seat_count || await countActiveSeats(auth.orgId);
      const perSeatPrice = await resolvePerSeatPrice(newPlanId, newInterval);
      const totalAmount = Math.round(perSeatPrice * seatCount * 100) / 100;

      const updated: Subscription = {
        ...existing,
        plan_id: newPlanId,
        billing_interval: newInterval,
        amount: totalAmount,
        price_per_seat: perSeatPrice,
        seat_count: seatCount,
        current_period_end: periodEnd,
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: undefined,
        updated_at: now,
      };

      await kv.set(`subscription:${auth.orgId}`, updated);

      // Log the plan change
      const eventId = crypto.randomUUID();
      const isUpgrade = plan.price > oldPlan.price;
      const event: BillingEvent = {
        id: eventId,
        organization_id: auth.orgId,
        type: 'plan_change',
        amount: totalAmount,
        currency: plan.currency,
        status: 'succeeded',
        description: `${isUpgrade ? 'Upgraded' : 'Changed'} from ${oldPlan.name} to ${plan.name} plan`,
        plan_id: newPlanId,
        invoice_number: generateInvoiceNumber(),
        created_at: now,
      };
      await kv.set(`billing_event:${auth.orgId}:${eventId}`, event);

      // Simulate prorated payment for upgrades
      if (isUpgrade) {
        const proratedAmount = Math.round((newAmount - (existing.amount || 0)) * 0.5 * 100) / 100;
        if (proratedAmount > 0) {
          const paymentId = crypto.randomUUID();
          const paymentEvent: BillingEvent = {
            id: paymentId,
            organization_id: auth.orgId,
            type: 'payment',
            amount: proratedAmount,
            currency: plan.currency,
            status: 'succeeded',
            description: `Prorated charge for upgrade to ${plan.name}`,
            plan_id: newPlanId,
            invoice_number: generateInvoiceNumber(),
            created_at: now,
          };
          await kv.set(`billing_event:${auth.orgId}:${paymentId}`, paymentEvent);
        }
      }

      console.log(`[subscriptions] Plan changed for org ${auth.orgId}: ${existing.plan_id} → ${newPlanId}`);
      return c.json({ subscription: updated });
    } catch (error: any) {
      console.error('[subscriptions] Error updating subscription:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /subscriptions/cancel — cancel at end of period
  app.post(`${PREFIX}/subscriptions/cancel`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      if (!['admin', 'super_admin'].includes(auth.role)) {
        return c.json({ error: 'Only admins can manage subscriptions' }, 403);
      }

      const existing: Subscription | null = await kv.get(`subscription:${auth.orgId}`);
      if (!existing) {
        return c.json({ error: 'No active subscription found' }, 404);
      }

      const body = await c.req.json().catch(() => ({}));
      const immediate = body.immediate === true;
      const now = new Date().toISOString();

      const updated: Subscription = {
        ...existing,
        status: immediate ? 'canceled' : existing.status,
        cancel_at_period_end: !immediate,
        canceled_at: now,
        updated_at: now,
      };

      await kv.set(`subscription:${auth.orgId}`, updated);

      const plan = PLANS[existing.plan_id];
      const eventId = crypto.randomUUID();
      const event: BillingEvent = {
        id: eventId,
        organization_id: auth.orgId,
        type: 'subscription_canceled',
        amount: 0,
        currency: plan.currency,
        status: 'succeeded',
        description: immediate
          ? `${plan.name} plan canceled immediately`
          : `${plan.name} plan set to cancel at end of billing period`,
        plan_id: existing.plan_id,
        created_at: now,
      };
      await kv.set(`billing_event:${auth.orgId}:${eventId}`, event);

      console.log(`[subscriptions] Subscription canceled for org ${auth.orgId} (immediate=${immediate})`);
      return c.json({ subscription: updated });
    } catch (error: any) {
      console.error('[subscriptions] Error canceling subscription:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /subscriptions/reactivate — reactivate a canceled subscription
  app.post(`${PREFIX}/subscriptions/reactivate`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      if (!['admin', 'super_admin'].includes(auth.role)) {
        return c.json({ error: 'Only admins can manage subscriptions' }, 403);
      }

      const existing: Subscription | null = await kv.get(`subscription:${auth.orgId}`);
      if (!existing) {
        return c.json({ error: 'No subscription found' }, 404);
      }

      const now = new Date().toISOString();
      const updated: Subscription = {
        ...existing,
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: undefined,
        updated_at: now,
      };

      // If expired, reset period
      if (new Date(existing.current_period_end) < new Date()) {
        updated.current_period_start = now;
        const end = new Date();
        if (existing.billing_interval === 'year') {
          end.setFullYear(end.getFullYear() + 1);
        } else {
          end.setMonth(end.getMonth() + 1);
        }
        updated.current_period_end = end.toISOString();

        // Simulate renewal payment
        const plan = PLANS[existing.plan_id];
        const paymentId = crypto.randomUUID();
        const paymentEvent: BillingEvent = {
          id: paymentId,
          organization_id: auth.orgId,
          type: 'payment',
          amount: existing.amount,
          currency: plan.currency,
          status: 'succeeded',
          description: `Renewal payment for ${plan.name} plan`,
          plan_id: existing.plan_id,
          invoice_number: generateInvoiceNumber(),
          created_at: now,
        };
        await kv.set(`billing_event:${auth.orgId}:${paymentId}`, paymentEvent);
      }

      await kv.set(`subscription:${auth.orgId}`, updated);

      console.log(`[subscriptions] Subscription reactivated for org ${auth.orgId}`);
      return c.json({ subscription: updated });
    } catch (error: any) {
      console.error('[subscriptions] Error reactivating subscription:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /subscriptions/billing-history — list billing events
  app.get(`${PREFIX}/subscriptions/billing-history`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const events: BillingEvent[] = await kv.getByPrefix(`billing_event:${auth.orgId}:`);
      // Sort newest first
      events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return c.json({ events });
    } catch (error: any) {
      console.error('[subscriptions] Error fetching billing history:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /subscriptions/payment-method — get stored payment method
  app.get(`${PREFIX}/subscriptions/payment-method`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const pm: PaymentMethod | null = await kv.get(`payment_method:${auth.orgId}`);
      return c.json({ payment_method: pm || null });
    } catch (error: any) {
      console.error('[subscriptions] Error fetching payment method:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // PUT /subscriptions/payment-method — update payment method
  app.put(`${PREFIX}/subscriptions/payment-method`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      if (!['admin', 'super_admin'].includes(auth.role)) {
        return c.json({ error: 'Only admins can manage billing' }, 403);
      }

      const body = await c.req.json();
      const now = new Date().toISOString();
      const pmId = crypto.randomUUID();

      const pm: PaymentMethod = {
        id: pmId,
        organization_id: auth.orgId,
        type: 'card',
        brand: body.brand || 'Visa',
        last4: body.last4 || '4242',
        exp_month: body.exp_month || 12,
        exp_year: body.exp_year || 2028,
        is_default: true,
        created_at: now,
      };

      await kv.set(`payment_method:${auth.orgId}`, pm);

      // Update subscription with new payment method
      const sub: Subscription | null = await kv.get(`subscription:${auth.orgId}`);
      if (sub) {
        sub.payment_method_id = pmId;
        sub.updated_at = now;
        await kv.set(`subscription:${auth.orgId}`, sub);
      }

      console.log(`[subscriptions] Payment method updated for org ${auth.orgId}`);
      return c.json({ payment_method: pm });
    } catch (error: any) {
      console.error('[subscriptions] Error updating payment method:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /subscriptions/simulate-payment — demo: simulate a recurring payment
  app.post(`${PREFIX}/subscriptions/simulate-payment`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const sub: Subscription | null = await kv.get(`subscription:${auth.orgId}`);
      if (!sub) return c.json({ error: 'No active subscription' }, 404);

      const plan = PLANS[sub.plan_id];
      const now = new Date();

      // Simulate payment
      const paymentId = crypto.randomUUID();
      const event: BillingEvent = {
        id: paymentId,
        organization_id: auth.orgId,
        type: 'payment',
        amount: sub.amount,
        currency: sub.currency,
        status: 'succeeded',
        description: `Recurring payment for ${plan.name} plan`,
        plan_id: sub.plan_id,
        invoice_number: generateInvoiceNumber(),
        created_at: now.toISOString(),
      };
      await kv.set(`billing_event:${auth.orgId}:${paymentId}`, event);

      // Advance the billing period
      const newStart = now.toISOString();
      const newEnd = new Date(now);
      if (sub.billing_interval === 'year') {
        newEnd.setFullYear(newEnd.getFullYear() + 1);
      } else {
        newEnd.setMonth(newEnd.getMonth() + 1);
      }

      sub.current_period_start = newStart;
      sub.current_period_end = newEnd.toISOString();
      sub.updated_at = newStart;
      await kv.set(`subscription:${auth.orgId}`, sub);

      console.log(`[subscriptions] Simulated payment for org ${auth.orgId}: $${sub.amount}`);
      return c.json({ event, subscription: sub });
    } catch (error: any) {
      console.error('[subscriptions] Error simulating payment:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /subscriptions/plan-config — get custom plan configuration (super_admin only)
  app.get(`${PREFIX}/subscriptions/plan-config`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      if (auth.role !== 'super_admin') {
        return c.json({ error: 'Only super admins can manage plan configuration' }, 403);
      }

      const config: any = await kv.get('billing_plan_config:global');
      // Return stored config, or defaults derived from PLANS
      if (config) {
        return c.json({ config });
      }

      // Build default config from hardcoded PLANS
      const defaultConfig = {
        plans: Object.fromEntries(
          Object.entries(PLANS).map(([key, plan]) => [
            key,
            {
              name: plan.name,
              description: '',
              price: plan.price,
              priceAnnual: plan.priceAnnual,
              currency: plan.currency,
              features: [...plan.features],
              popular: key === 'professional',
              trialEnabled: true,
              visible: true,
            },
          ]),
        ),
        trialDays: 14,
        currency: 'USD',
        billingTerms: 'Payment due upon subscription activation. All prices in USD.',
        annualDiscountPercent: 17,
        updated_at: null,
      };

      return c.json({ config: defaultConfig });
    } catch (error: any) {
      console.error('[subscriptions] Error fetching plan config:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // PUT /subscriptions/plan-config — update custom plan configuration (super_admin only)
  app.put(`${PREFIX}/subscriptions/plan-config`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      if (auth.role !== 'super_admin') {
        return c.json({ error: 'Only super admins can manage plan configuration' }, 403);
      }

      const body = await c.req.json();
      const now = new Date().toISOString();

      const config = {
        ...body,
        updated_at: now,
        updated_by: auth.userId,
      };

      await kv.set('billing_plan_config:global', config);

      console.log(`[subscriptions] Plan config updated by super_admin ${auth.userId}`);
      return c.json({ config, success: true });
    } catch (error: any) {
      console.error('[subscriptions] Error updating plan config:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /subscriptions/adjust-seats — recalculate billing after user changes
  app.post(`${PREFIX}/subscriptions/adjust-seats`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      if (!['admin', 'super_admin'].includes(auth.role)) {
        return c.json({ error: 'Only admins can adjust seats' }, 403);
      }

      const existing: Subscription | null = await kv.get(`subscription:${auth.orgId}`);
      if (!existing || !['active', 'trialing'].includes(existing.status)) {
        // No active subscription to adjust — silently succeed
        return c.json({ subscription: existing || null, adjusted: false });
      }

      const oldSeatCount = existing.seat_count ?? 1;
      const newSeatCount = await countActiveSeats(auth.orgId);

      // No change needed
      if (newSeatCount === oldSeatCount) {
        return c.json({ subscription: existing, adjusted: false });
      }

      const perSeatPrice = existing.price_per_seat ?? await resolvePerSeatPrice(existing.plan_id, existing.billing_interval);
      const newAmount = Math.round(perSeatPrice * newSeatCount * 100) / 100;
      const oldAmount = existing.amount;
      const now = new Date().toISOString();

      const updated: Subscription = {
        ...existing,
        seat_count: newSeatCount,
        price_per_seat: perSeatPrice,
        amount: newAmount,
        updated_at: now,
      };

      await kv.set(`subscription:${auth.orgId}`, updated);

      // Log a billing adjustment event
      const plan = PLANS[existing.plan_id] || { name: existing.plan_id, currency: 'USD' };
      const eventId = crypto.randomUUID();
      const diff = newAmount - oldAmount;
      const direction = newSeatCount < oldSeatCount ? 'decreased' : 'increased';
      const event: BillingEvent = {
        id: eventId,
        organization_id: auth.orgId,
        type: diff < 0 ? 'credit' : 'payment',
        amount: Math.abs(diff),
        currency: existing.currency || 'USD',
        status: 'succeeded',
        description: `Seat count ${direction} from ${oldSeatCount} to ${newSeatCount} — billing adjusted from $${oldAmount.toFixed(2)} to $${newAmount.toFixed(2)}/${existing.billing_interval}`,
        plan_id: existing.plan_id,
        created_at: now,
      };
      await kv.set(`billing_event:${auth.orgId}:${eventId}`, event);

      console.log(`[subscriptions] Seats adjusted for org ${auth.orgId}: ${oldSeatCount} → ${newSeatCount}, amount: $${oldAmount} → $${newAmount}`);
      return c.json({ subscription: updated, adjusted: true, old_seats: oldSeatCount, new_seats: newSeatCount });
    } catch (error: any) {
      console.error('[subscriptions] Error adjusting seats:', error);
      return c.json({ error: error.message }, 500);
    }
  });

}