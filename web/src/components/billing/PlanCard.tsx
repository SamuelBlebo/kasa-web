import { Button, Card, CardBody } from '@/components/ui';
import { cn } from '@/utils/cn';
import { getPlanPrice, type PlanDefinition } from '@/config/plans';
import { formatMoney } from '@/utils/format';
import type { Currency } from '@/types';

export function PlanCard({
  plan,
  currency,
  isCurrent,
  busy,
  onSelect,
}: {
  plan: PlanDefinition;
  currency: Currency;
  isCurrent: boolean;
  busy?: boolean;
  onSelect: () => void;
}) {
  const price = getPlanPrice(plan, currency);
  return (
    <Card className={cn(isCurrent && 'border-brand ring-1 ring-brand')}>
      <CardBody className="flex h-full flex-col gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-ink">{plan.name}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-ink">
            {price === 0 ? 'Free' : formatMoney(price, currency)}
            {price > 0 && <span className="text-sm font-normal text-muted"> /mo</span>}
          </p>
        </div>
        <ul className="space-y-1.5 text-sm text-muted">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className="mt-0.5 text-brand" aria-hidden>
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant={isCurrent ? 'secondary' : 'primary'}
          disabled={isCurrent}
          loading={busy}
          onClick={onSelect}
          className="mt-auto"
        >
          {isCurrent ? 'Current plan' : 'Choose plan'}
        </Button>
      </CardBody>
    </Card>
  );
}
