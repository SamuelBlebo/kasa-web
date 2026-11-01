import { Link } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { PLAN_CATALOG, PLAN_ORDER, getPlanPrice } from '@/config/plans';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatMoney } from '@/utils/format';
import { detectCurrency } from '@/utils/detectCurrency';
import { cn } from '@/utils/cn';

const HIGHLIGHTED_PLAN = 'growth';

export function PricingPage() {
  usePageTitle('Pricing');
  const currency = detectCurrency();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Simple pricing that grows with you</h1>
        <p className="mt-3 text-muted">
          Start free. Upgrade only when your order volume needs more room — no contracts, no setup fees.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((planId) => {
          const plan = PLAN_CATALOG[planId];
          const price = getPlanPrice(plan, currency);
          const highlighted = planId === HIGHLIGHTED_PLAN;
          return (
            <Card
              key={plan.id}
              className={cn('flex flex-col p-6', highlighted && 'border-brand ring-1 ring-brand')}
            >
              {highlighted && (
                <span className="mb-3 inline-block w-fit rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold text-ink">{plan.name}</h2>
              <p className="mt-2">
                <span className="text-3xl font-bold tracking-tight text-ink">
                  {price === 0 ? 'Free' : formatMoney(price, currency)}
                </span>
                {price > 0 && <span className="text-sm text-muted"> / month</span>}
              </p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted">
                    <span aria-hidden className="mt-0.5 text-brand">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link to="/signup" className="mt-6">
                <Button variant={highlighted ? 'primary' : 'secondary'} fullWidth>
                  {price === 0 ? 'Start free' : 'Get started'}
                </Button>
              </Link>
            </Card>
          );
        })}
      </div>

      <p className="mt-10 text-center text-sm text-muted">
        Prices shown in {currency} based on your location.{' '}
        <Link to="/faq" className="font-semibold text-brand">
          Have a question?
        </Link>
      </p>
    </div>
  );
}
