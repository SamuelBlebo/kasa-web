import { cn } from '@/utils/cn';

export function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min((used / limit) * 100, 100) : 0;
  const overLimit = limit !== null && used >= limit;
  const nearLimit = !overLimit && limit !== null && used / limit >= 0.8;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className={cn('text-xs', overLimit ? 'font-semibold text-danger' : 'text-muted')}>
          {limit === null ? `${used.toLocaleString()} · Unlimited` : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
        </span>
      </div>
      {limit !== null && (
        <div className="h-2 rounded-full bg-raised">
          <div
            className={cn('h-2 rounded-full', overLimit ? 'bg-danger' : nearLimit ? 'bg-warn' : 'bg-brand')}
            style={{ width: `${Math.max(pct, used > 0 ? 4 : 0)}%` }}
          />
        </div>
      )}
    </div>
  );
}
