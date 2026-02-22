/**
 * Subscription & Billing client — communicates with the server endpoints.
 * All routes go through the Edge Function (KV-backed).
 */

import { projectId } from './supabase/info';
import { getServerHeaders } from './server-headers';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

// ── Types ───────────────────────────────────────────────────────────────

export type PlanId = 'starter' | 'professional' | 'enterprise';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  priceAnnual: number;
  currency: string;
  interval: string;
  maxUsers: number;
  maxContacts: number;
  maxStorage: string;
  features: string[];
}

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

// ── API calls ───────────────────────────────────────────────────────────

export async function getPlans(): Promise<Record<string, Plan>> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/plans`, { headers });
  if (!res.ok) throw new Error('Failed to fetch plans');
  const data = await res.json();
  return data.plans;
}

export async function getCurrentSubscription(): Promise<Subscription | null> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/current`, { headers });
  if (!res.ok) throw new Error('Failed to fetch subscription');
  const data = await res.json();
  return data.subscription;
}

export async function createSubscription(
  planId: PlanId,
  billingInterval: 'month' | 'year' = 'month',
  paymentMethod?: Partial<PaymentMethod>,
  trial = false,
): Promise<Subscription> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      plan_id: planId,
      billing_interval: billingInterval,
      payment_method: paymentMethod,
      trial,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create subscription');
  }
  const data = await res.json();
  return data.subscription;
}

export async function updateSubscription(
  planId?: PlanId,
  billingInterval?: 'month' | 'year',
): Promise<Subscription> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/update`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ plan_id: planId, billing_interval: billingInterval }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update subscription');
  }
  const data = await res.json();
  return data.subscription;
}

export async function cancelSubscription(immediate = false): Promise<Subscription> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/cancel`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ immediate }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to cancel subscription');
  }
  const data = await res.json();
  return data.subscription;
}

export async function reactivateSubscription(): Promise<Subscription> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/reactivate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reactivate subscription');
  }
  const data = await res.json();
  return data.subscription;
}

export async function getBillingHistory(): Promise<BillingEvent[]> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/billing-history`, { headers });
  if (!res.ok) throw new Error('Failed to fetch billing history');
  const data = await res.json();
  return data.events || [];
}

export async function getPaymentMethod(): Promise<PaymentMethod | null> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/payment-method`, { headers });
  if (!res.ok) throw new Error('Failed to fetch payment method');
  const data = await res.json();
  return data.payment_method;
}

export async function updatePaymentMethod(pm: Partial<PaymentMethod>): Promise<PaymentMethod> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/payment-method`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(pm),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update payment method');
  }
  const data = await res.json();
  return data.payment_method;
}

export async function simulatePayment(): Promise<{ event: BillingEvent; subscription: Subscription }> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/simulate-payment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to simulate payment');
  }
  return res.json();
}

// ── Helpers ─────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
