/**
 * Stripe Client Module — wraps Stripe SDK with async initialization
 * and fallback support for KV storage during development.
 *
 * Usage:
 *   import { stripe } from './stripe-client.ts';
 *   const customer = await stripe.customers.create({ email: 'user@example.com' });
 *
 * Environment Variables:
 *   STRIPE_API_KEY — Stripe secret key (sk_test_* or sk_live_*)
 *   USE_STRIPE_API — "true" | "false" (default: false, uses KV fallback)
 */

// Type stubs for Stripe SDK (will be imported via npm when available)
export interface StripeCustomer {
  id: string;
  email?: string;
  metadata?: Record<string, string>;
  created: number;
}

export interface StripePaymentMethod {
  id: string;
  type: 'card';
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  customer?: string;
}

export interface StripeSubscription {
  id: string;
  customer: string;
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        product: string;
        recurring?: {
          interval: 'month' | 'year';
          interval_count: number;
        };
      };
    }>;
  };
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing';
  current_period_start: number;
  current_period_end: number;
  trial_end?: number;
  canceled_at?: number;
  metadata?: Record<string, string>;
}

export interface StripeInvoice {
  id: string;
  customer: string;
  subscription?: string;
  amount_paid: number;
  amount_due: number;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  pdf?: string;
}

export interface StripePaymentIntent {
  id: string;
  customer?: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'processing' | 'requires_action' | 'requires_capture' | 'requires_confirmation' | 'requires_payment_method' | 'canceled';
  client_secret?: string;
}

export interface StripeEvent {
  id: string;
  type: string;
  created: number;
  data: {
    object: any;
    previous_attributes?: Record<string, any>;
  };
}

// ───────────────────────────────────────────────────────────────────────

class StripeClient {
  private initialized = false;
  private useStripeApi = false;
  private stripeSDK: any = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const useStripe = (Deno.env.get('USE_STRIPE_API') || 'false').toLowerCase() === 'true';
    const stripeKey = Deno.env.get('STRIPE_API_KEY');

    this.useStripeApi = useStripe && !!stripeKey;

    if (this.useStripeApi) {
      try {
        // Dynamically import Stripe SDK (when available in Deno)
        // For now, we'll initialize with a mock check
        this.stripeSDK = {
          apiKey: stripeKey,
          configured: true,
        };
        console.log('[Stripe] Using real Stripe API');
      } catch (error) {
        console.warn('[Stripe] SDK not available, falling back to KV:', error);
        this.useStripeApi = false;
      }
    } else {
      console.log('[Stripe] Using KV fallback (USE_STRIPE_API=false or STRIPE_API_KEY not set)');
    }

    this.initialized = true;
  }

  isConfigured(): boolean {
    return this.useStripeApi && !!this.stripeSDK;
  }

  // ─ Customer Operations ───────────────────────────────────────────

  async customers_create(params: {
    email: string;
    metadata?: Record<string, string>;
    name?: string;
  }): Promise<StripeCustomer> {
    await this.initialize();

    if (this.useStripeApi && this.stripeSDK) {
      // TODO: Implement real Stripe API call
      // const stripe = require('stripe')(this.stripeSDK.apiKey);
      // return await stripe.customers.create(params);
      console.log('[Stripe] POST /customers', params);
      throw new Error('Stripe SDK not yet integrated in Deno runtime');
    }

    // KV fallback
    return {
      id: `cus_kv_${Math.random().toString(36).slice(2)}`,
      email: params.email,
      metadata: params.metadata || {},
      created: Math.floor(Date.now() / 1000),
    };
  }

  async customers_retrieve(customerId: string): Promise<StripeCustomer | null> {
    await this.initialize();

    if (this.useStripeApi && this.stripeSDK) {
      console.log('[Stripe] GET /customers/:id', customerId);
      throw new Error('Stripe SDK not yet integrated in Deno runtime');
    }

    // KV fallback
    return {
      id: customerId,
      created: Math.floor(Date.now() / 1000),
    };
  }

  // ─ Payment Method Operations ─────────────────────────────────────

  async paymentMethods_create(params: {
    type: 'card';
    card: {
      number: string;
      exp_month: number;
      exp_year: number;
      cvc: string;
    };
    billing_details?: {
      email?: string;
      name?: string;
    };
  }): Promise<StripePaymentMethod> {
    await this.initialize();

    if (this.useStripeApi && this.stripeSDK) {
      console.log('[Stripe] POST /payment_methods', { type: params.type });
      throw new Error('Stripe SDK not yet integrated in Deno runtime');
    }

    // KV fallback - tokenize locally (dev only)
    return {
      id: `pm_kv_${Math.random().toString(36).slice(2)}`,
      type: 'card',
      card: {
        brand: 'visa',
        last4: params.card.number.slice(-4),
        exp_month: params.card.exp_month,
        exp_year: params.card.exp_year,
      },
    };
  }

  async paymentMethods_attach(
    paymentMethodId: string,
    params: { customer: string }
  ): Promise<StripePaymentMethod> {
    await this.initialize();

    if (this.useStripeApi && this.stripeSDK) {
      console.log('[Stripe] POST /payment_methods/:id/attach', paymentMethodId, params);
      throw new Error('Stripe SDK not yet integrated in Deno runtime');
    }

    return {
      id: paymentMethodId,
      type: 'card',
      customer: params.customer,
    };
  }

  // ─ Subscription Operations ───────────────────────────────────────

  async subscriptions_create(params: {
    customer: string;
    items: Array<{ price: string }>;
    trial_period_days?: number;
    metadata?: Record<string, string>;
  }): Promise<StripeSubscription> {
    await this.initialize();

    if (this.useStripeApi && this.stripeSDK) {
      console.log('[Stripe] POST /subscriptions', params);
      throw new Error('Stripe SDK not yet integrated in Deno runtime');
    }

    // KV fallback
    const now = Math.floor(Date.now() / 1000);
    const trialDays = params.trial_period_days || 0;
    return {
      id: `sub_kv_${Math.random().toString(36).slice(2)}`,
      customer: params.customer,
      status: trialDays > 0 ? 'trialing' : 'active',
      current_period_start: now,
      current_period_end: now + (trialDays > 0 ? trialDays * 86400 : 30 * 86400),
      trial_end: trialDays > 0 ? now + trialDays * 86400 : undefined,
      items: {
        data: params.items.map((item) => ({
          id: `si_kv_${Math.random().toString(36).slice(2)}`,
          price: {
            id: item.price,
            product: 'prod_kv_demo',
            recurring: { interval: 'month', interval_count: 1 },
          },
        })),
      },
      metadata: params.metadata || {},
    };
  }

  async subscriptions_retrieve(subscriptionId: string): Promise<StripeSubscription | null> {
    await this.initialize();

    if (this.useStripeApi && this.stripeSDK) {
      console.log('[Stripe] GET /subscriptions/:id', subscriptionId);
      throw new Error('Stripe SDK not yet integrated in Deno runtime');
    }

    // KV fallback
    return {
      id: subscriptionId,
      customer: 'cus_kv_demo',
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      items: { data: [] },
    };
  }

  async subscriptions_update(
    subscriptionId: string,
    params: {
      items?: Array<{ id: string; price?: string }>;
      trial_end?: number | 'now';
      metadata?: Record<string, string>;
    }
  ): Promise<StripeSubscription> {
    await this.initialize();

    if (this.useStripeApi && this.stripeSDK) {
      console.log('[Stripe] POST /subscriptions/:id', subscriptionId, params);
      throw new Error('Stripe SDK not yet integrated in Deno runtime');
    }

    // KV fallback
    const sub = await this.subscriptions_retrieve(subscriptionId);
    return sub || { id: subscriptionId, customer: '', status: 'active', current_period_start: 0, current_period_end: 0, items: { data: [] } };
  }

  async subscriptions_cancel(
    subscriptionId: string,
    params?: { invoice_now?: boolean; prorate?: boolean }
  ): Promise<StripeSubscription> {
    await this.initialize();

    if (this.useStripeApi && this.stripeSDK) {
      console.log('[Stripe] DELETE /subscriptions/:id', subscriptionId, params);
      throw new Error('Stripe SDK not yet integrated in Deno runtime');
    }

    // KV fallback
    return {
      id: subscriptionId,
      customer: 'cus_kv_demo',
      status: 'canceled',
      canceled_at: Math.floor(Date.now() / 1000),
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000),
      items: { data: [] },
    };
  }

  // ─ Invoice Operations ────────────────────────────────────────────

  async invoices_list(params: { customer?: string; limit?: number }): Promise<StripeInvoice[]> {
    await this.initialize();

    if (this.useStripeApi && this.stripeSDK) {
      console.log('[Stripe] GET /invoices', params);
      throw new Error('Stripe SDK not yet integrated in Deno runtime');
    }

    // KV fallback
    return [];
  }

  // ─ Webhook Helpers ──────────────────────────────────────────────

  async webhooks_constructEvent(
    body: string,
    signature: string,
    secret: string
  ): Promise<StripeEvent | null> {
    await this.initialize();

    if (this.useStripeApi && this.stripeSDK) {
      console.log('[Stripe] Validating webhook signature');
      throw new Error('Stripe SDK not yet integrated in Deno runtime');
    }

    console.warn('[Stripe] Webhook validation not available in KV fallback mode');
    return null;
  }
}

// ───────────────────────────────────────────────────────────────────────
// Singleton instance + convenience exports
// ───────────────────────────────────────────────────────────────────────

let instance: StripeClient | null = null;

export function getStripeClient(): StripeClient {
  if (!instance) {
    instance = new StripeClient();
  }
  return instance;
}

export const stripe = {
  customers: {
    create: (params: any) => getStripeClient().customers_create(params),
    retrieve: (customerId: string) => getStripeClient().customers_retrieve(customerId),
  },
  paymentMethods: {
    create: (params: any) => getStripeClient().paymentMethods_create(params),
    attach: (paymentMethodId: string, params: any) => getStripeClient().paymentMethods_attach(paymentMethodId, params),
  },
  subscriptions: {
    create: (params: any) => getStripeClient().subscriptions_create(params),
    retrieve: (subscriptionId: string) => getStripeClient().subscriptions_retrieve(subscriptionId),
    update: (subscriptionId: string, params: any) => getStripeClient().subscriptions_update(subscriptionId, params),
    cancel: (subscriptionId: string, params?: any) => getStripeClient().subscriptions_cancel(subscriptionId, params),
  },
  invoices: {
    list: (params: any) => getStripeClient().invoices_list(params),
  },
  webhooks: {
    constructEvent: (body: string, signature: string, secret: string) =>
      getStripeClient().webhooks_constructEvent(body, signature, secret),
  },
};
