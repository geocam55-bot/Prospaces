import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import {
  CreditCard,
  Calendar,
  Users,
  Database,
  Clock,
  ArrowUpCircle,
  XCircle,
  RotateCcw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Zap,
  Crown,
  Building2,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  daysUntil,
  type Subscription,
  type PaymentMethod,
  type PlanId,
} from '../../utils/subscription-client';

interface CurrentPlanProps {
  subscription: Subscription | null;
  paymentMethod: PaymentMethod | null;
  isAdmin: boolean;
  actionLoading: boolean;
  onChangePlan: () => void;
  onCancel: () => void;
  onReactivate: () => void;
}

const PLAN_DETAILS: Record<PlanId, { name: string; icon: typeof Zap; color: string; bgColor: string; maxUsers: number; maxContacts: number; storage: string }> = {
  starter: {
    name: 'Starter',
    icon: Zap,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    maxUsers: 3,
    maxContacts: 500,
    storage: '2 GB',
  },
  professional: {
    name: 'Professional',
    icon: Crown,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    maxUsers: 10,
    maxContacts: 5000,
    storage: '25 GB',
  },
  enterprise: {
    name: 'Enterprise',
    icon: Building2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    maxUsers: -1,
    maxContacts: -1,
    storage: '100 GB',
  },
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700 border-green-200' },
  trialing: { label: 'Trial', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  past_due: { label: 'Past Due', className: 'bg-red-100 text-red-700 border-red-200' },
  canceled: { label: 'Canceled', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  expired: { label: 'Expired', className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export function CurrentPlan({ subscription, paymentMethod, isAdmin, actionLoading, onChangePlan, onCancel, onReactivate }: CurrentPlanProps) {
  if (!subscription) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <CreditCard className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Active Subscription</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            You're currently on the free tier. Upgrade to unlock advanced CRM features, more users, and priority support.
          </p>
          {isAdmin && (
            <Button onClick={onChangePlan} className="bg-blue-600 hover:bg-blue-700">
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              View Plans & Pricing
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const plan = PLAN_DETAILS[subscription.plan_id] || PLAN_DETAILS.starter;
  const status = STATUS_STYLES[subscription.status] || STATUS_STYLES.expired;
  const Icon = plan.icon;
  const daysLeft = daysUntil(subscription.current_period_end);
  const isTrialing = subscription.status === 'trialing';
  const isCanceling = subscription.cancel_at_period_end;
  const isCanceled = subscription.status === 'canceled';
  const isExpired = subscription.status === 'expired';

  // Demo usage numbers (would come from real data in production)
  const usageUsers = 2;
  const usageContacts = 127;
  const usageStorage = 0.4; // GB

  return (
    <div className="space-y-6">
      {/* Cancel warning */}
      {isCanceling && !isCanceled && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Your subscription is set to cancel on <strong>{formatDate(subscription.current_period_end)}</strong>.
            You'll retain access until then.
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="ml-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={onReactivate}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                Keep Subscription
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Trial ending warning */}
      {isTrialing && daysLeft <= 3 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Your trial ends in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>.
            Add a payment method to continue uninterrupted.
          </AlertDescription>
        </Alert>
      )}

      {/* Main plan card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${plan.bgColor}`}>
                <Icon className={`h-6 w-6 ${plan.color}`} />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {plan.name} Plan
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-slate-500 mt-0.5">
                  {formatCurrency(subscription.amount)}/{subscription.billing_interval === 'year' ? 'year' : 'month'}
                </p>
              </div>
            </div>

            {isAdmin && !isCanceled && !isExpired && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onChangePlan}>
                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                  Change Plan
                </Button>
                {!isCanceling && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={onCancel}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                    Cancel
                  </Button>
                )}
              </div>
            )}

            {isAdmin && (isCanceled || isExpired) && (
              <Button onClick={onReactivate} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                Reactivate
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Billing period info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  {isTrialing ? 'Trial Ends' : 'Next Billing'}
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {formatDate(subscription.current_period_end)}
                </p>
                <p className="text-xs text-slate-400">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <CreditCard className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Payment Method</p>
                <p className="text-sm font-medium text-slate-900">
                  {paymentMethod
                    ? `${paymentMethod.brand} ****${paymentMethod.last4}`
                    : 'None on file'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <Clock className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Billing Interval</p>
                <p className="text-sm font-medium text-slate-900 capitalize">
                  {subscription.billing_interval}ly
                </p>
              </div>
            </div>
          </div>

          {/* Usage metrics */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">Usage</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Users */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Users className="h-3.5 w-3.5" />
                    Users
                  </span>
                  <span className="font-medium text-slate-900">
                    {usageUsers} / {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers}
                  </span>
                </div>
                {plan.maxUsers > 0 && (
                  <Progress value={(usageUsers / plan.maxUsers) * 100} className="h-1.5" />
                )}
              </div>

              {/* Contacts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Database className="h-3.5 w-3.5" />
                    Contacts
                  </span>
                  <span className="font-medium text-slate-900">
                    {usageContacts.toLocaleString()} / {plan.maxContacts === -1 ? 'Unlimited' : plan.maxContacts.toLocaleString()}
                  </span>
                </div>
                {plan.maxContacts > 0 && (
                  <Progress value={(usageContacts / plan.maxContacts) * 100} className="h-1.5" />
                )}
              </div>

              {/* Storage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Database className="h-3.5 w-3.5" />
                    Storage
                  </span>
                  <span className="font-medium text-slate-900">
                    {usageStorage} GB / {plan.storage}
                  </span>
                </div>
                <Progress value={(usageStorage / parseFloat(plan.storage)) * 100} className="h-1.5" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
