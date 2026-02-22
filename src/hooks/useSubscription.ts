import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentSubscription,
  type Subscription,
  type PlanId,
} from '../utils/subscription-client';

/**
 * Feature gates mapped to minimum plan tier.
 * 'starter' = all paid plans, 'professional' = pro+enterprise, 'enterprise' = enterprise only.
 * Features not listed are available on all plans including free.
 */
const FEATURE_GATES: Record<string, PlanId> = {
  // Starter+ features
  'email-integration': 'starter',
  'basic-reports': 'starter',

  // Professional+ features
  'marketing-automation': 'professional',
  'inventory-management': 'professional',
  'document-management': 'professional',
  'project-wizards': 'professional',
  'advanced-reports': 'professional',
  'customer-portal': 'professional',

  // Enterprise-only features
  'sso-saml': 'enterprise',
  'audit-log': 'enterprise',
  'api-access': 'enterprise',
  'custom-integrations': 'enterprise',
  'priority-support': 'enterprise',
};

const PLAN_TIERS: Record<PlanId, number> = {
  starter: 1,
  professional: 2,
  enterprise: 3,
};

const PLAN_LIMITS = {
  starter: { users: 3, contacts: 500, storageGB: 2 },
  professional: { users: 10, contacts: 5000, storageGB: 25 },
  enterprise: { users: Infinity, contacts: Infinity, storageGB: 100 },
} as const;

export interface SubscriptionState {
  subscription: Subscription | null;
  loading: boolean;
  /** Current plan id, or null if on free tier */
  planId: PlanId | null;
  /** Whether the subscription is active (including trialing) */
  isActive: boolean;
  /** Whether the subscription is in trial */
  isTrialing: boolean;
  /** Check if a feature is available on the current plan */
  hasFeature: (feature: string) => boolean;
  /** Check if plan meets minimum tier */
  meetsMinPlan: (minPlan: PlanId) => boolean;
  /** Get plan limits */
  limits: { users: number; contacts: number; storageGB: number };
  /** Reload subscription data */
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const sub = await getCurrentSubscription();
      setSubscription(sub);
    } catch (err) {
      console.error('[useSubscription] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isActive =
    !!subscription &&
    (subscription.status === 'active' || subscription.status === 'trialing');

  const isTrialing = subscription?.status === 'trialing';
  const planId = isActive ? subscription!.plan_id : null;

  const meetsMinPlan = useCallback(
    (minPlan: PlanId): boolean => {
      if (!planId) return false;
      return PLAN_TIERS[planId] >= PLAN_TIERS[minPlan];
    },
    [planId],
  );

  const hasFeature = useCallback(
    (feature: string): boolean => {
      const minPlan = FEATURE_GATES[feature];
      if (!minPlan) return true; // Feature not gated → available to all
      return meetsMinPlan(minPlan);
    },
    [meetsMinPlan],
  );

  const limits = planId
    ? PLAN_LIMITS[planId]
    : { users: 1, contacts: 50, storageGB: 0.1 }; // free tier limits

  return {
    subscription,
    loading,
    planId,
    isActive,
    isTrialing,
    hasFeature,
    meetsMinPlan,
    limits,
    refresh: load,
  };
}
