import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Check, Zap, Crown, Building2, ArrowRight } from 'lucide-react';
import { formatCurrency, type PlanId } from '../../utils/subscription-client';

interface PricingPlansProps {
  currentPlanId: PlanId | null;
  subscriptionStatus: string | null;
  isAdmin: boolean;
  onSelectPlan: (planId: PlanId, interval: 'month' | 'year') => void;
}

const PLANS: {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  priceAnnual: number;
  icon: typeof Zap;
  popular?: boolean;
  features: string[];
  limits: string;
}[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small teams getting started with CRM',
    price: 29,
    priceAnnual: 290,
    icon: Zap,
    limits: '3 users, 500 contacts, 2 GB',
    features: [
      'Core CRM (Contacts, Deals, Tasks)',
      'Up to 3 users',
      'Up to 500 contacts',
      'Email integration',
      'Basic reports',
      '2 GB storage',
      'Community support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing businesses that need full-featured CRM',
    price: 79,
    priceAnnual: 790,
    icon: Crown,
    popular: true,
    limits: '10 users, 5K contacts, 25 GB',
    features: [
      'Everything in Starter',
      'Up to 10 users',
      'Up to 5,000 contacts',
      'Marketing automation',
      'Inventory management',
      'Document management',
      'Project Wizards (3D planners)',
      'Advanced reports & analytics',
      'Customer portal',
      '25 GB storage',
      'Email support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations needing advanced features',
    price: 199,
    priceAnnual: 1990,
    icon: Building2,
    limits: 'Unlimited users & contacts, 100 GB',
    features: [
      'Everything in Professional',
      'Unlimited users',
      'Unlimited contacts',
      'Dedicated account manager',
      'Custom integrations',
      'SSO / SAML support',
      'Audit log',
      'Priority support (24/7)',
      'API access',
      '100 GB storage',
      'Custom onboarding',
    ],
  },
];

export function PricingPlans({ currentPlanId, subscriptionStatus, isAdmin, onSelectPlan }: PricingPlansProps) {
  const [annual, setAnnual] = useState(false);

  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  return (
    <div className="space-y-6">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <Label htmlFor="billing-toggle" className={`text-sm font-medium ${!annual ? 'text-slate-900' : 'text-slate-500'}`}>
          Monthly
        </Label>
        <Switch
          id="billing-toggle"
          checked={annual}
          onCheckedChange={setAnnual}
        />
        <Label htmlFor="billing-toggle" className={`text-sm font-medium ${annual ? 'text-slate-900' : 'text-slate-500'}`}>
          Annual
        </Label>
        {annual && (
          <Badge variant="secondary" className="bg-green-100 text-green-700 ml-1">
            Save ~17%
          </Badge>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = currentPlanId === plan.id && isActive;
          const price = annual ? plan.priceAnnual : plan.price;
          const interval = annual ? 'year' : 'month';
          const Icon = plan.icon;

          // Determine button state
          let buttonLabel = 'Get Started';
          let buttonVariant: 'default' | 'outline' | 'secondary' = 'default';
          let isDisabled = false;

          if (isCurrent) {
            buttonLabel = 'Current Plan';
            buttonVariant = 'secondary';
            isDisabled = true;
          } else if (isActive && currentPlanId) {
            const currentIdx = PLANS.findIndex(p => p.id === currentPlanId);
            const thisIdx = PLANS.findIndex(p => p.id === plan.id);
            if (thisIdx > currentIdx) {
              buttonLabel = 'Upgrade';
            } else {
              buttonLabel = 'Downgrade';
              buttonVariant = 'outline';
            }
          }

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col transition-all duration-200 ${
                plan.popular
                  ? 'border-blue-500 shadow-lg shadow-blue-100 ring-1 ring-blue-500'
                  : isCurrent
                  ? 'border-green-500 ring-1 ring-green-500'
                  : 'hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-3 py-0.5">Most Popular</Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-green-600 text-white px-3 py-0.5">Current Plan</Badge>
                </div>
              )}

              <CardHeader className="pb-4 pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${plan.popular ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    <Icon className={`h-5 w-5 ${plan.popular ? 'text-blue-600' : 'text-slate-600'}`} />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                </div>
                <p className="text-sm text-slate-500">{plan.description}</p>
              </CardHeader>

              <CardContent className="flex flex-col flex-1">
                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-900">
                      {formatCurrency(price)}
                    </span>
                    <span className="text-slate-500 text-sm">
                      /{annual ? 'year' : 'mo'}
                    </span>
                  </div>
                  {annual && (
                    <p className="text-sm text-green-600 mt-1">
                      {formatCurrency(plan.price * 12 - plan.priceAnnual)} saved per year
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{plan.limits}</p>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.popular ? 'text-blue-600' : 'text-green-600'}`} />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  variant={buttonVariant}
                  className={`w-full ${plan.popular && !isCurrent ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  disabled={isDisabled || !isAdmin}
                  onClick={() => onSelectPlan(plan.id, interval)}
                >
                  {buttonLabel}
                  {!isCurrent && !isDisabled && <ArrowRight className="h-4 w-4 ml-1" />}
                </Button>

                {!isActive && !isCurrent && (
                  <button
                    className="w-full text-center text-xs text-blue-600 hover:text-blue-700 mt-2 underline"
                    onClick={() => onSelectPlan(plan.id, interval)}
                    disabled={!isAdmin}
                  >
                    Start 14-day free trial
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ/Note */}
      <div className="text-center text-sm text-slate-500 mt-4">
        All plans include SSL encryption, daily backups, and 99.9% uptime SLA.
        <br />
        Need a custom plan? <span className="text-blue-600 cursor-pointer hover:underline">Contact sales</span>
      </div>
    </div>
  );
}
