import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, EmptyState, Input, Modal, Select, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductFormModal } from '@/components/products/ProductFormModal';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useCollection';
import { useToast } from '@/hooks/useToast';
import { deleteProduct, productsQuery } from '@/services';
import { PLAN_CATALOG } from '@/config/plans';
import type { Product, WithId } from '@/types';

type StatusFilter = 'all' | 'active' | 'inactive';

export function ProductsPage() {
  const { org } = useAuth();
  const orgId = org!.id;
  const toast = useToast();
  const products = useCollection(useMemo(() => productsQuery(orgId), [orgId]));

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<WithId<Product> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WithId<Product> | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = products.status === 'ready' ? products.data : [];
  const categories = useMemo(() => Array.from(new Set(rows.map((p) => p.category))).sort(), [rows]);

  const filtered = rows.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (category !== 'all' && p.category !== category) return false;
    if (status === 'active' && !p.active) return false;
    if (status === 'inactive' && p.active) return false;
    return true;
  });

  const productLimit = PLAN_CATALOG[org!.subscription.plan].productLimit;
  const atProductLimit = productLimit !== null && rows.length >= productLimit;

  const openAdd = () => {
    if (atProductLimit) return;
    setEditingProduct(null);
    setFormOpen(true);
  };
  const openEdit = (product: WithId<Product>) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProduct(orgId, deleteTarget.id, deleteTarget.imagePath);
      toast.success('Product deleted.');
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete this product.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="This catalogue is exactly what the bot shows a customer."
        action={
          <Button onClick={openAdd} disabled={atProductLimit}>
            Add product
          </Button>
        }
      />

      {atProductLimit && (
        <Card className="mb-4 border-warn/40">
          <CardBody className="flex flex-wrap items-center gap-3 p-4">
            <p className="text-sm text-ink">
              <strong>
                You've reached your {PLAN_CATALOG[org!.subscription.plan].name} plan's {productLimit}-product limit.
              </strong>{' '}
              Upgrade to add more.
            </p>
            <Link to="/settings" className="text-sm font-semibold text-brand">
              Upgrade plan
            </Link>
          </CardBody>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full sm:max-w-xs sm:flex-1">
          <Input
            aria-label="Search products"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-40">
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>

      {products.status === 'loading' && (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      )}

      {products.status === 'error' && (
        <Card>
          <EmptyState title="Products did not load" description={products.error} />
        </Card>
      )}

      {products.status === 'ready' && rows.length === 0 && (
        <Card>
          <EmptyState
            title="No products yet"
            description="Add your first product — it shows up in the WhatsApp catalogue right away."
            action={<Button onClick={openAdd}>Add product</Button>}
          />
        </Card>
      )}

      {products.status === 'ready' && rows.length > 0 && filtered.length === 0 && (
        <Card>
          <EmptyState title="No products match" description="Try a different search term or filter." />
        </Card>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              currency={org!.currency}
              onEdit={() => openEdit(product)}
              onDelete={() => {
                setDeleteError(null);
                setDeleteTarget(product);
              }}
            />
          ))}
        </div>
      )}

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        orgId={orgId}
        product={editingProduct}
        categories={categories}
      />

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete product"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" loading={deleting} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Delete <strong>{deleteTarget?.name}</strong>? This also removes its photo, and cannot be undone.
        </p>
        {deleteError && (
          <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{deleteError}</p>
        )}
      </Modal>
    </>
  );
}
