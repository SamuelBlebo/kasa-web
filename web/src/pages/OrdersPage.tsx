import { useMemo, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Button, Card, EmptyState, Input, Modal, Select, Spinner, StatusBadge } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useCollection';
import { useToast } from '@/hooks/useToast';
import { ordersQuery, updateOrder, type OrderUpdatePatch } from '@/services';
import { ORDER_FLOW, type Order, type OrderStatus, type WithId } from '@/types';
import { formatDate, formatMoney, toDatetimeLocalInput } from '@/utils/format';
import { toMessage } from '@/utils/errors';

type StatusFilter = 'all' | OrderStatus;

const STATUS_OPTIONS: OrderStatus[] = [...ORDER_FLOW, 'cancelled'];
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function nextStatus(status: OrderStatus): OrderStatus | null {
  const index = ORDER_FLOW.indexOf(status);
  if (index === -1 || index === ORDER_FLOW.length - 1) return null;
  return ORDER_FLOW[index + 1];
}

export function OrdersPage() {
  const { org } = useAuth();
  const orgId = org!.id;
  const orders = useCollection(useMemo(() => ordersQuery(orgId), [orgId]));

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<WithId<Order> | null>(null);

  const rows = orders.status === 'ready' ? orders.data : [];
  const filtered = rows.filter((o) => {
    if (status !== 'all' && o.status !== status) return false;
    if (search) {
      const needle = search.trim().toLowerCase();
      const haystack = `${o.number} ${o.customerName} ${o.customerPhone}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  // Keep the open detail modal in sync with live updates to the order it shows.
  const liveSelected = selected ? (rows.find((o) => o.id === selected.id) ?? selected) : null;

  return (
    <>
      <PageHeader title="Orders" description="Every order a customer placed in a WhatsApp chat." />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full sm:max-w-xs sm:flex-1">
          <Input
            aria-label="Search orders"
            placeholder="Search by number, name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {orders.status === 'loading' && (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      )}

      {orders.status === 'error' && (
        <Card>
          <EmptyState title="Orders did not load" description={orders.error} />
        </Card>
      )}

      {orders.status === 'ready' && rows.length === 0 && (
        <Card>
          <EmptyState
            title="No orders yet"
            description="Once WhatsApp is connected, every order a customer places lands here."
          />
        </Card>
      )}

      {orders.status === 'ready' && rows.length > 0 && filtered.length === 0 && (
        <Card>
          <EmptyState title="No orders match" description="Try a different search term or filter." />
        </Card>
      )}

      {filtered.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Placed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelected(order)}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-raised"
                  >
                    <td className="px-5 py-3 font-semibold text-ink">#{order.number}</td>
                    <td className="px-5 py-3 text-muted">
                      <div className="text-ink">{order.customerName}</div>
                      <div className="text-xs">{order.customerPhone}</div>
                    </td>
                    <td className="px-5 py-3 text-muted">{itemCount(order)} item{itemCount(order) === 1 ? '' : 's'}</td>
                    <td className="px-5 py-3 font-semibold text-ink">{formatMoney(order.total, order.currency)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {liveSelected && (
        <OrderDetailModal order={liveSelected} orgId={orgId} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function itemCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

function OrderDetailModal({
  order,
  orgId,
  onClose,
}: {
  order: WithId<Order>;
  orgId: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [note, setNote] = useState(order.note ?? '');
  const [riderName, setRiderName] = useState(order.riderName ?? '');
  const [riderPhone, setRiderPhone] = useState(order.riderPhone ?? '');
  const [eta, setEta] = useState(toDatetimeLocalInput(order.estimatedDeliveryAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const advance = nextStatus(order.status);
  const isTerminal = order.status === 'delivered' || order.status === 'cancelled';
  const canManageDelivery = order.status !== 'cancelled';

  /**
   * Whatever's currently in these fields rides along with every save —
   * including a status advance. That's deliberate: the WhatsApp message the
   * customer gets on "out for delivery" is built from the rider/ETA already
   * on the document at that moment, so setting them here is what gets them
   * into that message.
   */
  const deliveryPatch = (): OrderUpdatePatch => ({
    note: note || null,
    riderName: riderName || null,
    riderPhone: riderPhone || null,
    estimatedDeliveryAt: eta ? Timestamp.fromDate(new Date(eta)) : null,
  });

  const save = async (patch: OrderUpdatePatch, closeAfter: boolean, successMessage: string) => {
    setBusy(true);
    setError(null);
    try {
      await updateOrder(orgId, order.id, patch);
      toast.success(successMessage);
      if (closeAfter) onClose();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const applyStatus = (status: OrderStatus) =>
    save(
      { status, ...deliveryPatch() },
      status === 'cancelled' || status === 'delivered',
      status === 'cancelled' ? 'Order cancelled.' : `Order marked ${STATUS_LABEL[status].toLowerCase()}.`,
    );

  const saveDeliveryDetails = () => save(deliveryPatch(), false, 'Delivery details saved.');

  return (
    <Modal
      open
      title={`Order #${order.number}`}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          {!isTerminal && (
            <Button type="button" variant="danger" loading={busy} onClick={() => applyStatus('cancelled')}>
              Cancel order
            </Button>
          )}
          {advance && (
            <Button type="button" loading={busy} onClick={() => applyStatus(advance)}>
              Mark {STATUS_LABEL[advance].toLowerCase()}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <StatusBadge status={order.status} />
          <span className="text-xs text-muted">{formatDate(order.createdAt)}</span>
        </div>

        <div>
          <p className="font-semibold text-ink">{order.customerName}</p>
          <a href={`tel:${order.customerPhone}`} className="text-brand">
            {order.customerPhone}
          </a>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted">Deliver to</p>
          <p className="text-ink">{order.deliveryAddress}</p>
        </div>

        {(order.statusHistory?.length ?? 0) > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-muted">Delivery timeline</p>
            <ol className="space-y-2 border-l border-line pl-3">
              {[...(order.statusHistory ?? [])]
                .sort((a, b) => a.changedAt.toMillis() - b.changedAt.toMillis())
                .map((event, index) => (
                  <li key={`${event.status}-${index}`} className="relative text-xs">
                    <span className="absolute -left-[15px] top-1 h-2 w-2 rounded-full bg-brand" aria-hidden />
                    <span className="font-semibold text-ink">{STATUS_LABEL[event.status]}</span>{' '}
                    <span className="text-muted">{formatDate(event.changedAt)}</span>
                  </li>
                ))}
            </ol>
          </div>
        )}

        <div className="rounded-xl border border-line">
          {order.items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center justify-between border-b border-line px-3 py-2 last:border-0"
            >
              <span className="text-ink">
                {item.quantity} × {item.name}
              </span>
              <span className="font-medium text-ink">{formatMoney(item.price * item.quantity, order.currency)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2 text-muted">
            <span>Delivery</span>
            <span>{formatMoney(order.deliveryFee, order.currency)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-line px-3 py-2 font-semibold text-ink">
            <span>Total</span>
            <span>{formatMoney(order.total, order.currency)}</span>
          </div>
        </div>

        {canManageDelivery && (
          <div className="space-y-3 rounded-xl border border-line p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted">Delivery</p>
              <Button type="button" variant="ghost" size="sm" loading={busy} onClick={saveDeliveryDetails}>
                Save
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Rider name"
                placeholder="e.g. Kwame"
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
              />
              <Input
                label="Rider phone"
                type="tel"
                placeholder="+233 24 000 0000"
                value={riderPhone}
                onChange={(e) => setRiderPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink" htmlFor="order-eta">
                Estimated delivery
              </label>
              <input
                id="order-eta"
                type="datetime-local"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
              />
            </div>
            <p className="text-xs text-muted">
              Whatever's set here goes out in the customer's "out for delivery" WhatsApp message.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-muted" htmlFor="order-note">
            Note (visible to your team only)
          </label>
          <textarea
            id="order-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-raised px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            placeholder="e.g. Called to confirm delivery time"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
        )}
      </div>
    </Modal>
  );
}
