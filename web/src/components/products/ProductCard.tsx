import { Badge, Button } from '@/components/ui';
import { LOW_STOCK_THRESHOLD } from '@/services';
import { cn } from '@/utils/cn';
import { formatMoney } from '@/utils/format';
import type { Product, WithId } from '@/types';

interface ProductCardProps {
  product: WithId<Product>;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}

/** The card used everywhere a product is listed — the products grid today, order-builder pickers later. */
export function ProductCard({ product, currency, onEdit, onDelete }: ProductCardProps) {
  const outOfStock = product.stock === 0;
  const lowStock = !outOfStock && product.stock <= LOW_STOCK_THRESHOLD;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="relative aspect-[4/3] w-full bg-raised">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-3xl text-muted" aria-hidden>
            ◫
          </div>
        )}
        {!product.active && (
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
            Inactive
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-ink" title={product.name}>
            {product.name}
          </h3>
          <Badge className="shrink-0">{product.category}</Badge>
        </div>

        <p className="text-lg font-bold tracking-tight text-ink">{formatMoney(product.price, currency)}</p>

        <p className={cn('text-xs font-medium', outOfStock ? 'text-danger' : lowStock ? 'text-warn' : 'text-muted')}>
          {outOfStock ? 'Out of stock' : `${product.stock} in stock`}
        </p>

        <div className="mt-auto flex gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={onEdit}>
            Edit
          </Button>
          <Button type="button" variant="danger" size="sm" className="flex-1" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
