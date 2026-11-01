import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Input, Modal, Select, Spinner, StatusBadge } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useCollection';
import { useToast } from '@/hooks/useToast';
import {
  customerOrdersQuery,
  customersQuery,
  isRepeatCustomer,
  sendBroadcast,
  updateCustomerNote,
} from '@/services';
import type { Customer, WithId } from '@/types';
import { formatDate, formatMoney } from '@/utils/format';
import { toMessage } from '@/utils/errors';

type AudienceFilter = 'all' | 'repeat';

export function CustomersPage() {
  const { org } = useAuth();
  const orgId = org!.id;
  const customers = useCollection(useMemo(() => customersQuery(orgId), [orgId]));

  const [search, setSearch] = useState('');
  const [audience, setAudience] = useState<AudienceFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<WithId<Customer> | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const rows = customers.status === 'ready' ? customers.data : [];
  const filtered = rows.filter((c) => {
    if (audience === 'repeat' && !isRepeatCustomer(c)) return false;
    if (search && !`${c.name} ${c.phone}`.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach((c) => next.delete(c.id));
      else filtered.forEach((c) => next.add(c.id));
      return next;
    });
  };

  // Keep the open detail modal in sync with live updates (e.g. a note just saved).
  const liveDetail = detail ? (rows.find((c) => c.id === detail.id) ?? detail) : null;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Built from the numbers that message you. Nobody signs up."
        action={
          <Button onClick={() => setBroadcastOpen(true)} disabled={selectedIds.size === 0}>
            Broadcast{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full sm:max-w-xs sm:flex-1">
          <Input
            aria-label="Search customers"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select aria-label="Filter customers" value={audience} onChange={(e) => setAudience(e.target.value as AudienceFilter)}>
            <option value="all">All customers</option>
            <option value="repeat">Repeat customers</option>
          </Select>
        </div>
      </div>

      {customers.status === 'loading' && (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      )}

      {customers.status === 'error' && (
        <Card>
          <EmptyState title="Customers did not load" description={customers.error} />
        </Card>
      )}

      {customers.status === 'ready' && rows.length === 0 && (
        <Card>
          <EmptyState
            title="No customers yet"
            description="A customer record is created the first time someone messages your WhatsApp number."
          />
        </Card>
      )}

      {customers.status === 'ready' && rows.length > 0 && filtered.length === 0 && (
        <Card>
          <EmptyState title="No customers match" description="Try a different search term or filter." />
        </Card>
      )}

      {filtered.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                  <th className="w-10 px-5 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                      aria-label="Select all visible customers"
                    />
                  </th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Orders</th>
                  <th className="px-5 py-3">Total spent</th>
                  <th className="px-5 py-3">Last order</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id} className="border-b border-line last:border-0 hover:bg-raised">
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(customer.id)}
                        onChange={() => toggleSelect(customer.id)}
                        className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                        aria-label={`Select ${customer.name}`}
                      />
                    </td>
                    <td className="cursor-pointer px-5 py-3" onClick={() => setDetail(customer)}>
                      <div className="flex items-center gap-2">
                        <span className="text-ink">{customer.name}</span>
                        {isRepeatCustomer(customer) && <Badge className="bg-brand/10 text-brand">Repeat</Badge>}
                      </div>
                      <div className="text-xs text-muted">{customer.phone}</div>
                    </td>
                    <td className="cursor-pointer px-5 py-3 text-muted" onClick={() => setDetail(customer)}>
                      {customer.orderCount}
                    </td>
                    <td className="cursor-pointer px-5 py-3 font-semibold text-ink" onClick={() => setDetail(customer)}>
                      {formatMoney(customer.totalSpent, org!.currency)}
                    </td>
                    <td className="cursor-pointer px-5 py-3 text-xs text-muted" onClick={() => setDetail(customer)}>
                      {formatDate(customer.lastOrderAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {liveDetail && (
        <CustomerDetailModal
          customer={liveDetail}
          orgId={orgId}
          currency={org!.currency}
          onClose={() => setDetail(null)}
        />
      )}

      {broadcastOpen && (
        <BroadcastModal
          customerIds={[...selectedIds]}
          onClose={() => setBroadcastOpen(false)}
          onSent={() => {
            setBroadcastOpen(false);
            setSelectedIds(new Set());
          }}
        />
      )}
    </>
  );
}

function CustomerDetailModal({
  customer,
  orgId,
  currency,
  onClose,
}: {
  customer: WithId<Customer>;
  orgId: string;
  currency: string;
  onClose: () => void;
}) {
  const orders = useCollection(useMemo(() => customerOrdersQuery(orgId, customer.id), [orgId, customer.id]));
  const rows = orders.status === 'ready' ? orders.data : [];

  const toast = useToast();
  const [note, setNote] = useState(customer.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveNote = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateCustomerNote(orgId, customer.id, note || null);
      toast.success('Note saved.');
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={customer.name}
      onClose={onClose}
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <a href={`tel:${customer.phone}`} className="text-brand">
            {customer.phone}
          </a>
          {isRepeatCustomer(customer) && <Badge className="bg-brand/10 text-brand">Repeat customer</Badge>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-line p-3 text-center">
            <p className="text-xs text-muted">Orders</p>
            <p className="text-lg font-bold text-ink">{customer.orderCount}</p>
          </div>
          <div className="rounded-xl border border-line p-3 text-center">
            <p className="text-xs text-muted">Total spent</p>
            <p className="text-lg font-bold text-ink">{formatMoney(customer.totalSpent, currency)}</p>
          </div>
          <div className="rounded-xl border border-line p-3 text-center">
            <p className="text-xs text-muted">Last order</p>
            <p className="text-sm font-semibold text-ink">{formatDate(customer.lastOrderAt)}</p>
          </div>
        </div>

        {customer.address && (
          <div>
            <p className="text-xs font-semibold text-muted">Last known address</p>
            <p className="text-ink">{customer.address}</p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-muted" htmlFor="customer-note">
              Note (visible to your team only)
            </label>
            <Button type="button" variant="ghost" size="sm" loading={busy} onClick={saveNote}>
              Save
            </Button>
          </div>
          <textarea
            id="customer-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-raised px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            placeholder="e.g. Prefers evening deliveries"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold text-muted">Order history</p>
          {orders.status === 'loading' && (
            <div className="grid place-items-center py-6">
              <Spinner />
            </div>
          )}
          {orders.status === 'ready' && rows.length === 0 && (
            <p className="text-xs text-muted">No orders yet.</p>
          )}
          {rows.length > 0 && (
            <div className="rounded-xl border border-line">
              {rows.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b border-line px-3 py-2 last:border-0"
                >
                  <div>
                    <p className="font-medium text-ink">#{order.number}</p>
                    <p className="text-xs text-muted">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} />
                    <span className="font-semibold text-ink">{formatMoney(order.total, order.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function BroadcastModal({
  customerIds,
  onClose,
  onSent,
}: {
  customerIds: string[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sentCount: number; failedCount: number } | null>(null);

  const send = async () => {
    if (!message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await sendBroadcast(message.trim(), customerIds);
      setResult(res);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="Broadcast a message"
      onClose={onClose}
      footer={
        result ? (
          <Button type="button" onClick={onSent}>
            Done
          </Button>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" loading={busy} disabled={!message.trim()} onClick={send}>
              Send to {customerIds.length}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <p className="text-sm text-ink">
          Sent to {result.sentCount} of {customerIds.length} customer{customerIds.length === 1 ? '' : 's'}.
          {result.failedCount > 0 && ` ${result.failedCount} could not be reached.`}
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Sending to {customerIds.length} customer{customerIds.length === 1 ? '' : 's'}.
          </p>
          <label className="sr-only" htmlFor="broadcast-message">
            Broadcast message
          </label>
          <textarea
            id="broadcast-message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            className="w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            placeholder="e.g. 20% off everything this weekend only!"
          />
          <p className="text-xs text-muted">
            Customers outside your 24-hour WhatsApp messaging window may need a Meta-approved template to
            receive this — anyone that can't be reached shows up in the failed count, not silently.
          </p>
          {error && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
          )}
        </div>
      )}
    </Modal>
  );
}
