import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Input, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useCollection';
import { useToast } from '@/hooks/useToast';
import { inboxQuery, markConversationRead, messagesQuery, sendReply } from '@/services';
import type { Customer, Message, WithId } from '@/types';
import { cn } from '@/utils/cn';
import { toMessage } from '@/utils/errors';
import { formatDate, initials } from '@/utils/format';

export function InboxPage() {
  const { org } = useAuth();
  const orgId = org!.id;
  const conversations = useCollection(useMemo(() => inboxQuery(orgId), [orgId]));

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<WithId<Customer> | null>(null);

  const rows = conversations.status === 'ready' ? conversations.data : [];
  const filtered = rows.filter(
    (c) => !search || `${c.name} ${c.phone}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  // Keep the open thread in sync with live updates (a new message, unreadCount clearing).
  const liveSelected = selected ? (rows.find((c) => c.id === selected.id) ?? selected) : null;

  const openConversation = (customer: WithId<Customer>) => {
    setSelected(customer);
    if (customer.unreadCount > 0) void markConversationRead(orgId, customer.id);
  };

  return (
    <>
      <PageHeader title="Inbox" description="Every WhatsApp conversation, in one place." />

      <Card className="overflow-hidden p-0">
        <div className="grid min-h-[32rem] grid-cols-1 sm:grid-cols-[20rem_1fr]">
          <div className={cn('flex flex-col border-line sm:border-r', liveSelected && 'hidden sm:flex')}>
            <div className="border-b border-line p-3">
              <Input
                aria-label="Search conversations"
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.status === 'loading' && (
                <div className="grid place-items-center py-16">
                  <Spinner />
                </div>
              )}
              {conversations.status === 'error' && (
                <div className="p-4">
                  <EmptyState title="Conversations did not load" description={conversations.error} />
                </div>
              )}
              {conversations.status === 'ready' && rows.length === 0 && (
                <div className="p-4">
                  <EmptyState
                    title="No conversations yet"
                    description="A conversation starts the moment someone messages your WhatsApp number."
                  />
                </div>
              )}
              {conversations.status === 'ready' && rows.length > 0 && filtered.length === 0 && (
                <div className="p-4">
                  <EmptyState title="No conversations match" description="Try a different search term." />
                </div>
              )}

              {filtered.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => openConversation(customer)}
                  className={cn(
                    'flex w-full items-center gap-3 border-b border-line px-3 py-3 text-left transition-colors hover:bg-raised',
                    liveSelected?.id === customer.id && 'bg-raised',
                  )}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                    {initials(customer.name || customer.phone)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{customer.name || customer.phone}</span>
                      <span className="shrink-0 text-xs text-muted">{formatDate(customer.lastMessageAt)}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">{customer.phone}</span>
                  </span>
                  {customer.unreadCount > 0 && (
                    <Badge className="shrink-0 bg-brand text-white">{customer.unreadCount}</Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className={cn('flex flex-col', !liveSelected && 'hidden sm:flex')}>
            {liveSelected ? (
              <ConversationThread orgId={orgId} customer={liveSelected} onBack={() => setSelected(null)} />
            ) : (
              <div className="grid flex-1 place-items-center p-6">
                <EmptyState title="Select a conversation" description="Pick someone on the left to see their messages." />
              </div>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}

function ConversationThread({
  orgId,
  customer,
  onBack,
}: {
  orgId: string;
  customer: WithId<Customer>;
  onBack: () => void;
}) {
  const messages = useCollection(useMemo(() => messagesQuery(orgId, customer.id), [orgId, customer.id]));
  const rows: WithId<Message>[] = messages.status === 'ready' ? messages.data : [];

  const toast = useToast();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      await sendReply(customer.id, text);
      setDraft('');
    } catch (err) {
      toast.error(toMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line p-3">
        <Button type="button" variant="ghost" size="sm" className="sm:hidden" onClick={onBack}>
          ← Back
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{customer.name || customer.phone}</p>
          <a href={`tel:${customer.phone}`} className="text-xs text-brand">
            {customer.phone}
          </a>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.status === 'loading' && (
          <div className="grid place-items-center py-10">
            <Spinner />
          </div>
        )}
        {messages.status === 'ready' && rows.length === 0 && (
          <p className="text-center text-xs text-muted">No messages logged yet.</p>
        )}
        {rows.map((message) => (
          <div key={message.id} className={cn('flex', message.direction === 'out' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                message.direction === 'out' ? 'bg-brand text-white' : 'bg-raised text-ink',
              )}
            >
              <p className="whitespace-pre-wrap">{message.body ?? `[${message.type}]`}</p>
              <p className={cn('mt-1 text-[10px]', message.direction === 'out' ? 'text-white/70' : 'text-muted')}>
                {formatDate(message.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Type a reply..."
          maxLength={1000}
          className="flex-1 resize-none rounded-xl border border-line bg-raised px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
        />
        <Button type="button" loading={sending} disabled={!draft.trim()} onClick={send}>
          Send
        </Button>
      </div>
      <p className="border-t border-line px-3 py-2 text-xs text-muted">
        Outside your 24-hour WhatsApp window, a reply may need a Meta-approved template to be delivered.
      </p>
    </>
  );
}
