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

type AnyRecord = Record<string, unknown>;

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
        const { default: Stripe } = await import('npm:stripe@16.12.0');
        this.stripeSDK = new Stripe(stripeKey!, {
          // Keep API version pinned for predictable payload shapes.
          apiVersion: '2024-06-20',
        } as any);
        console.log('[Stripe] Using real Stripe API');
      } catch (error) {
        console.warn('[Stripe] SDK not available, falling back to KV:', error);
        this.useStripeApi = false;
        this.stripeSDK = null;
      }
    } else {
      console.log('[Stripe] Using KV fallback (USE_STRIPE_API=false or STRIPE_API_KEY not set)');
    }

    this.initialized = true;
  }

  isConfigured(): boolean {
    return this.useStripeApi && !!this.stripeSDK;
  }

  isEnabled(): boolean {
    return this.isConfigured();
  }

  // ─ Customer Operations ───────────────────────────────────────────

  async customers_create(params: {
    email: string;
    metadata?: Record<string, string>;
    name?: string;
  }): Promise<StripeCustomer> {
    await this.initialize();

    if (this.useStripeApi && this.stripeSDK) {
      const customer = await this.stripeSDK.customers.create({
        email: params.email,
        name: params.name,
        metadata: params.metadata,
      });
      return {
        id: customer.id,
        email: customer.email || undefined,
        metadata: (customer.metadata || {}) as Record<string, string>,
        created: customer.created,
      };
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
      try {
        const customer = await this.stripeSDK.customers.retrieve(customerId);
        if (!customer || (customer as AnyRecord).deleted) return null;
        return {
          id: customer.id,
          email: customer.email || undefined,
          metadata: (customer.metadata || {}) as Record<string, string>,
          created: customer.created,
        };
      } catch (error: any) {
        if (error?.code === 'resource_missing') return null;
        throw error;
      }
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
      const paymentMethod = await this.stripeSDK.paymentMethods.create({
        type: params.type,
        card: params.card,
        billing_details: params.billing_details,
      });
      return {
        id: paymentMethod.id,
        type: 'card',
        card: paymentMethod.card
          ? {
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              exp_month: paymentMethod.card.exp_month,
              exp_year: paymentMethod.card.exp_year,
            }
          : undefined,
        customer: typeof paymentMethod.customer === 'string' ? paymentMethod.customer : undefined,
      };
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
      const paymentMethod = await this.stripeSDK.paymentMethods.attach(paymentMethodId, params);
      return {
        id: paymentMethod.id,
        type: 'card',
        card: paymentMethod.card
          ? {
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              exp_month: paymentMethod.card.exp_month,
              exp_year: paymentMethod.card.exp_year,
            }
          : undefined,
        customer: typeof paymentMethod.customer === 'string' ? paymentMethod.customer : undefined,
      };
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
      const subscription = await this.stripeSDK.subscriptions.create({
        customer: params.customer,
        items: params.items,
        trial_period_days: params.trial_period_days,
        metadata: params.metadata,
      });
      return {
        id: subscription.id,
        customer: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        items: {
          data: subscription.items.data.map((item: any) => ({
            id: item.id,
            price: {
              id: item.price?.id,
              product: typeof item.price?.product === 'string' ? item.price.product : item.price?.product?.id,
              recurring: item.price?.recurring
                ? {
                    interval: item.price.recurring.interval,
                    interval_count: item.price.recurring.interval_count,
                  }
                : undefined,
            },
          })),
        },
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        trial_end: subscription.trial_end || undefined,
        canceled_at: subscription.canceled_at || undefined,
        metadata: (subscription.metadata || {}) as Record<string, string>,
      };
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
      try {
        const subscription = await this.stripeSDK.subscriptions.retrieve(subscriptionId);
        return {
          id: subscription.id,
          customer: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
          items: {
            data: subscription.items.data.map((item: any) => ({
              id: item.id,
              price: {
                id: item.price?.id,
                product: typeof item.price?.product === 'string' ? item.price.product : item.price?.product?.id,
                recurring: item.price?.recurring
                  ? {
                      interval: item.price.recurring.interval,
                      interval_count: item.price.recurring.interval_count,
                    }
                  : undefined,
              },
            })),
          },
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          trial_end: subscription.trial_end || undefined,
          canceled_at: subscription.canceled_at || undefined,
          metadata: (subscription.metadata || {}) as Record<string, string>,
        };
      } catch (error: any) {
        if (error?.code === 'resource_missing') return null;
        throw error;
      }
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
      const subscription = await this.stripeSDK.subscriptions.update(subscriptionId, {
        items: params.items,
        trial_end: params.trial_end,
        metadata: params.metadata,
      });
      return {
        id: subscription.id,
        customer: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        items: {
          data: subscription.items.data.map((item: any) => ({
            id: item.id,
            price: {
              id: item.price?.id,
              product: typeof item.price?.product === 'string' ? item.price.product : item.price?.product?.id,
              recurring: item.price?.recurring
                ? {
                    interval: item.price.recurring.interval,
                    interval_count: item.price.recurring.interval_count,
                  }
                : undefined,
            },
          })),
        },
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        trial_end: subscription.trial_end || undefined,
        canceled_at: subscription.canceled_at || undefined,
        metadata: (subscription.metadata || {}) as Record<string, string>,
      };
    }

    // KV fallback
    const sub = await this.subscriptions_retrieve(subscriptionId);
    return sub || { id: subscriptionId, customer: '', status: 'active', current_period_start: 0, current_period_end: 0, items: { data: [] } };
  }

  async subscriptions_cancel(
    subscriptionId: string,
    params?: { invoice_now?: boolean; prorate?: boolean; at_period_end?: boolean }
  ): Promise<StripeSubscription> {
    await this.initialize();

    if (this.useStripeApi && this.stripeSDK) {
      let subscription: any;
      if (params?.at_period_end) {
        subscription = await this.stripeSDK.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        subscription = await this.stripeSDK.subscriptions.cancel(subscriptionId, {
          invoice_now: params?.invoice_now,
          prorate: params?.prorate,
        });
      }
      return {
        id: subscription.id,
        customer: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        items: {
          data: subscription.items.data.map((item: any) => ({
            id: item.id,
            price: {
              id: item.price?.id,
              product: typeof item.price?.product === 'string' ? item.price.product : item.price?.product?.id,
              recurring: item.price?.recurring
                ? {
                    interval: item.price.recurring.interval,
                    interval_count: item.price.recurring.interval_count,
                  }
                : undefined,
            },
          })),
        },
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        trial_end: subscription.trial_end || undefined,
        canceled_at: subscription.canceled_at || undefined,
        metadata: (subscription.metadata || {}) as Record<string, string>,
      };
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
      const response = await this.stripeSDK.invoices.list({
        customer: params.customer,
        limit: params.limit || 20,
      });
      return response.data.map((invoice: any) => ({
        id: invoice.id,
        customer: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id,
        subscription: typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id,
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        status: invoice.status,
        pdf: invoice.invoice_pdf || undefined,
      }));
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
      const event = await this.stripeSDK.webhooks.constructEventAsync(body, signature, secret);
      return {
        id: event.id,
        type: event.type,
        created: event.created,
        data: {
          object: event.data.object,
          previous_attributes: event.data.previous_attributes,
        },
      };
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
  isEnabled: () => getStripeClient().isEnabled(),
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
