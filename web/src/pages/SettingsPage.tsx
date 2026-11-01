import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { PlanCard } from '@/components/billing/PlanCard';
import { UsageMeter } from '@/components/billing/UsageMeter';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useCollection';
import { useToast } from '@/hooks/useToast';
import { changePlan, productsQuery } from '@/services';
import { PLAN_CATALOG, PLAN_ORDER } from '@/config/plans';
import type { PlanId } from '@/types';
import { toMessage } from '@/utils/errors';

export function SettingsPage() {
  const { org } = useAuth();
  const orgId = org!.id;
  const toast = useToast();
  const products = useCollection(useMemo(() => productsQuery(orgId), [orgId]));
  const productCount = products.status === 'ready' ? products.data.length : 0;

  const [changingPlan, setChangingPlan] = useState<PlanId | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('paystack') !== 'return') return;
    toast.success("Payment received — your plan updates within a few seconds once Paystack's confirmation arrives.");
    setSearchParams((prev) => {
      prev.delete('paystack');
      return prev;
    });
  }, [searchParams, setSearchParams, toast]);

  const currentPlan = PLAN_CATALOG[org!.subscription.plan];
  const ordersUsed = org!.subscription.ordersUsedThisPeriod ?? 0;

  const selectPlan = async (plan: PlanId) => {
    if (plan === org!.subscription.plan) return;
    setChangingPlan(plan);
    setPlanError(null);
    try {
      const result = await changePlan(plan);
      if (result.checkoutUrl) {
        // The plan hasn't actually changed yet — it only does once Paystack
        // confirms payment (billingWebhook). Send the merchant to pay; they
        // land back on Settings and see the new plan reflect once it lands.
        window.location.href = result.checkoutUrl;
        return;
      }
      toast.success(`Switched to the ${PLAN_CATALOG[plan].name} plan.`);
    } catch (error) {
      setPlanError(toMessage(error));
    } finally {
      setChangingPlan(null);
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="Business details, delivery, team and billing." />

      <Card className="mb-6">
        <CardHeader
          title="Plan & usage"
          description={`You're on the ${currentPlan.name} plan${org!.subscription.status === 'trialing' ? ' (trial)' : ''}.`}
        />
        <CardBody className="space-y-4">
          {org!.subscription.status === 'past_due' && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              Your last renewal charge didn't go through. Update or re-add a card by choosing your plan again below.
            </p>
          )}
          <UsageMeter label="Products" used={productCount} limit={currentPlan.productLimit} />
          <UsageMeter label="Orders this month" used={ordersUsed} limit={currentPlan.orderLimit} />
        </CardBody>
      </Card>

      {planError && (
        <p className="mb-4 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{planError}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((planId) => (
          <PlanCard
            key={planId}
            plan={PLAN_CATALOG[planId]}
            currency={org!.currency}
            isCurrent={planId === org!.subscription.plan}
            busy={changingPlan === planId}
            onSelect={() => selectPlan(planId)}
          />
        ))}
      </div>
    </>
  );
}
