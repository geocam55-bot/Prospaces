import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { PricingPlans } from './PricingPlans';
import { CurrentPlan } from './CurrentPlan';
import { BillingHistory } from './BillingHistory';
import { PaymentMethodCard } from './PaymentMethodCard';
import { CheckoutDialog } from './CheckoutDialog';
import { CancelConfirmDialog } from './CancelConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, CreditCard, Receipt, LayoutGrid, AlertTriangle, Sparkles } from 'lucide-react';
import type { User } from '../../App';
import {
  getCurrentSubscription,
  getBillingHistory,
  getPaymentMethod,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  reactivateSubscription,
  updatePaymentMethod,
  type Subscription,
  type BillingEvent,
  type PaymentMethod,
  type PlanId,
} from '../../utils/subscription-client';

interface SubscriptionBillingProps {
  user: User;
}

export function SubscriptionBilling({ user }: SubscriptionBillingProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingEvents, setBillingEvents] = useState<BillingEvent[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanId | null>(null);
  const [checkoutInterval, setCheckoutInterval] = useState<'month' | 'year'>('month');
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const isAdmin = ['admin', 'super_admin'].includes(user.role);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sub, events, pm] = await Promise.all([
        getCurrentSubscription(),
        getBillingHistory(),
        getPaymentMethod(),
      ]);
      setSubscription(sub);
      setBillingEvents(events);
      setPaymentMethod(pm);
    } catch (err: any) {
      console.error('Error loading subscription data:', err);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectPlan = (planId: PlanId, interval: 'month' | 'year') => {
    if (!isAdmin) {
      toast.error('Only admins can manage subscriptions');
      return;
    }
    setCheckoutPlan(planId);
    setCheckoutInterval(interval);
    setCheckoutOpen(true);
  };

  const handleCheckout = async (planId: PlanId, interval: 'month' | 'year', pm: Partial<PaymentMethod>, trial: boolean) => {
    try {
      setActionLoading(true);

      if (subscription && ['active', 'trialing'].includes(subscription.status)) {
        // Upgrade/downgrade
        const updated = await updateSubscription(planId, interval);
        setSubscription(updated);
        toast.success(`Plan changed to ${planId.charAt(0).toUpperCase() + planId.slice(1)}!`);
      } else {
        // New subscription
        const newSub = await createSubscription(planId, interval, pm, trial);
        setSubscription(newSub);
        toast.success(trial ? 'Trial started! Enjoy 14 days free.' : 'Subscription activated!');
      }

      setCheckoutOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err.message || 'Checkout failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (immediate: boolean = false) => {
    try {
      setActionLoading(true);
      const updated = await cancelSubscription(immediate);
      setSubscription(updated);
      setCancelDialogOpen(false);
      toast.success(
        immediate
          ? 'Subscription canceled immediately'
          : 'Subscription will cancel at end of billing period'
      );
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setActionLoading(true);
      const updated = await reactivateSubscription();
      setSubscription(updated);
      toast.success('Subscription reactivated!');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reactivate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePaymentMethod = async (pm: Partial<PaymentMethod>) => {
    try {
      setActionLoading(true);
      const updated = await updatePaymentMethod(pm);
      setPaymentMethod(updated);
      toast.success('Payment method updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payment method');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-slate-500">Loading subscription...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Banner */}
      <Alert className="border-amber-200 bg-amber-50">
        <Sparkles className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Demo Mode:</strong> This subscription system uses demonstration pricing. No real charges are processed.
          Payment information is simulated for testing purposes.
        </AlertDescription>
      </Alert>

      {!isAdmin && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Only organization admins can manage subscriptions and billing. Contact your admin for changes.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Plans</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payment</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
            {billingEvents.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {billingEvents.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <CurrentPlan
            subscription={subscription}
            paymentMethod={paymentMethod}
            isAdmin={isAdmin}
            actionLoading={actionLoading}
            onChangePlan={() => setActiveTab('plans')}
            onCancel={() => setCancelDialogOpen(true)}
            onReactivate={handleReactivate}
          />
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-6">
          <PricingPlans
            currentPlanId={subscription?.plan_id || null}
            subscriptionStatus={subscription?.status || null}
            isAdmin={isAdmin}
            onSelectPlan={handleSelectPlan}
          />
        </TabsContent>

        {/* Payment Method Tab */}
        <TabsContent value="payment" className="mt-6">
          <PaymentMethodCard
            paymentMethod={paymentMethod}
            isAdmin={isAdmin}
            actionLoading={actionLoading}
            onUpdate={handleUpdatePaymentMethod}
          />
        </TabsContent>

        {/* Billing History Tab */}
        <TabsContent value="history" className="mt-6">
          <BillingHistory events={billingEvents} />
        </TabsContent>
      </Tabs>

      {/* Checkout Dialog */}
      {checkoutPlan && (
        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          planId={checkoutPlan}
          interval={checkoutInterval}
          onIntervalChange={setCheckoutInterval}
          hasExistingSub={!!subscription && ['active', 'trialing'].includes(subscription.status)}
          currentPlanId={subscription?.plan_id}
          actionLoading={actionLoading}
          onConfirm={handleCheckout}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      {subscription && (
        <CancelConfirmDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          subscription={subscription}
          actionLoading={actionLoading}
          onConfirmCancel={handleCancel}
        />
      )}
    </div>
  );
}