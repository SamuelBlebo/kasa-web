import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTheme } from '@/hooks/useTheme';
import { chartColors } from '@/utils/chartColors';
import { formatMoney } from '@/utils/format';
import type { SalesBucket } from '@/utils/analytics';

function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function SalesTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: SalesBucket }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const bucket = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-ink">{label}</p>
      <p className="mt-1 font-semibold text-ink">{formatMoney(bucket.revenue, currency)}</p>
      <p className="text-muted">
        {bucket.orders} order{bucket.orders === 1 ? '' : 's'}
      </p>
    </div>
  );
}

/** One series (revenue), one hue — no legend needed; the card title already says what's plotted. */
export function SalesChart({ data, currency }: { data: SalesBucket[]; currency: string }) {
  const { theme } = useTheme();
  const colors = chartColors(theme);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke={colors.line} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: colors.muted, fontSize: 12 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: colors.muted, fontSize: 12 }}
          tickFormatter={compactNumber}
          width={40}
        />
        <Tooltip
          cursor={{ fill: colors.line, opacity: 0.5 }}
          content={<SalesTooltip currency={currency} />}
        />
        <Bar dataKey="revenue" fill={colors.brand} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
