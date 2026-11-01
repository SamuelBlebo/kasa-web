import { useMemo, useState } from 'react';
import { Button, Card, CardBody, CardHeader, EmptyState, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { SalesChart } from '@/components/analytics/SalesChart';
import { BestSellingList } from '@/components/analytics/BestSellingList';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useCollection';
import { customersQuery, ordersQuery } from '@/services';
import {
  bestSellingProducts,
  bucketSales,
  countReturningCustomers,
  ordersInPeriod,
  type SalesPeriod,
} from '@/utils/analytics';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';

const PERIODS: Array<{ id: SalesPeriod; label: string }> = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

type Tone = 'brand' | 'info' | 'warn' | 'muted';

const TONE_STYLES: Record<Tone, string> = {
  brand: 'bg-brand/10 text-brand',
  info: 'bg-info/10 text-info',
  warn: 'bg-warn/10 text-warn',
  muted: 'bg-raised text-muted',
};

function StatCard({ icon, tone, label, value, note }: { icon: string; tone: Tone; label: string; value: string; note?: string }) {
  return (
    <Card>
      <CardBody className="flex items-start gap-3.5 p-4 sm:p-5">
        <span aria-hidden className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg', TONE_STYLES[tone])}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold tracking-tight text-ink">{value}</p>
          {note && <p className="mt-0.5 truncate text-xs text-muted">{note}</p>}
        </div>
      </CardBody>
    </Card>
  );
}

export function AnalyticsPage() {
  const { org } = useAuth();
  const orgId = org!.id;
  const currency = org!.currency;

  const orders = useCollection(useMemo(() => ordersQuery(orgId), [orgId]));
  const customers = useCollection(useMemo(() => customersQuery(orgId), [orgId]));
  const loading = orders.status === 'loading' || customers.status === 'loading';

  const [period, setPeriod] = useState<SalesPeriod>('daily');

  const orderRows = orders.status === 'ready' ? orders.data : [];
  const customerRows = customers.status === 'ready' ? customers.data : [];

  const windowOrders = useMemo(() => ordersInPeriod(orderRows, period), [orderRows, period]);
  const buckets = useMemo(() => bucketSales(orderRows, period), [orderRows, period]);

  const revenue = buckets.reduce((sum, b) => sum + b.revenue, 0);
  const totalOrders = buckets.reduce((sum, b) => sum + b.orders, 0);
  const paidOrders = buckets.reduce((sum, b) => sum + b.paidOrders, 0);
  const averageOrderValue = paidOrders > 0 ? revenue / paidOrders : 0;
  const returningCustomers = useMemo(
    () => countReturningCustomers(windowOrders, customerRows),
    [windowOrders, customerRows],
  );
  const topProducts = useMemo(() => bestSellingProducts(windowOrders), [windowOrders]);

  const periodNote = period === 'daily' ? 'Last 14 days' : period === 'weekly' ? 'Last 12 weeks' : 'Last 12 months';
  const hasAnyOrders = orders.status === 'ready' && orderRows.length > 0;

  return (
    <>
      <PageHeader title="Analytics" description="Trends across revenue, orders and your best-selling products." />

      <div className="mb-4 flex gap-1 rounded-xl border border-line bg-surface p-1 sm:inline-flex">
        {PERIODS.map((p) => (
          <Button
            key={p.id}
            type="button"
            variant={period === p.id ? 'primary' : 'ghost'}
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {loading && (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      )}

      {orders.status === 'error' && (
        <Card>
          <EmptyState title="Analytics did not load" description={orders.error} />
        </Card>
      )}

      {!loading && orders.status === 'ready' && !hasAnyOrders && (
        <Card>
          <EmptyState
            title="No orders yet"
            description="Charts and metrics fill in once orders start coming through WhatsApp."
          />
        </Card>
      )}

      {!loading && hasAnyOrders && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon="◎" tone="brand" label="Revenue" value={formatMoney(revenue, currency)} note={periodNote} />
            <StatCard icon="☰" tone="info" label="Orders" value={totalOrders.toLocaleString()} note={periodNote} />
            <StatCard
              icon="⊘"
              tone="info"
              label="Average Order Value"
              value={formatMoney(averageOrderValue, currency)}
              note="Excludes cancelled"
            />
            <StatCard
              icon="↺"
              tone={returningCustomers > 0 ? 'brand' : 'muted'}
              label="Returning Customers"
              value={returningCustomers.toLocaleString()}
              note="Ordered before, and again this period"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader title={`${PERIODS.find((p) => p.id === period)?.label} sales`} description={periodNote} />
              <CardBody>
                <SalesChart data={buckets} currency={currency} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Best selling products" description={periodNote} />
              <CardBody>
                {topProducts.length === 0 ? (
                  <p className="text-sm text-muted">No items sold in this period yet.</p>
                ) : (
                  <BestSellingList products={topProducts} currency={currency} />
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
