import { formatMoney } from '@/utils/format';
import type { ProductSalesSummary } from '@/utils/analytics';

/**
 * A ranked magnitude comparison, not a categorical chart — every bar is the
 * same brand hue, since identity comes from the product name beside it, not
 * from color. See dataviz skill: "compare magnitude -> bar, sequential one hue."
 */
export function BestSellingList({ products, currency }: { products: ProductSalesSummary[]; currency: string }) {
  const max = Math.max(...products.map((p) => p.quantity), 1);

  return (
    <div className="space-y-4">
      {products.map((product, index) => (
        <div key={product.productId}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-ink">
              {index + 1}. {product.name}
            </span>
            <span className="shrink-0 text-xs text-muted">
              {product.quantity} sold · {formatMoney(product.revenue, currency)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-raised">
            <div
              className="h-2 rounded-full bg-brand"
              style={{ width: `${Math.max((product.quantity / max) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
