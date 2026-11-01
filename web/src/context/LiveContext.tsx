import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { customersRef, draftOrdersRef, itemsRef, ordersRef, paymentsRef } from '@/firebase';
import { can } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { CatalogItem, Order, WithId } from '@/types';
import { startOfToday } from '@/utils/format';

/**
 * The handful of live numbers the whole shell needs: the selvedge strip
 * along the top, and the badges in the navigation. One set of listeners for
 * the session instead of one per page. Each listener is only opened for
 * roles that are allowed to read that collection.
 */
interface Live {
  todayOrders: WithId<Order>[];
  takenTodayMinor: number;
  paymentsToCheck: number;
  unreadChats: number;
  needsReply: number;
  openDrafts: number;
  items: WithId<CatalogItem>[];
  lowStock: WithId<CatalogItem>[];
  ready: boolean;
}

const EMPTY: Live = { todayOrders: [], takenTodayMinor: 0, paymentsToCheck: 0, unreadChats: 0, needsReply: 0, openDrafts: 0, items: [], lowStock: [], ready: false };
const LiveContext = createContext<Live>(EMPTY);

export function LiveProvider({ children }: { children: ReactNode }) {
  const { org, profile } = useAuth();
  const orgId = org?.id;
  const role = profile?.role ?? null;
  const [todayOrders, setTodayOrders] = useState<WithId<Order>[]>([]);
  const [paymentsToCheck, setPayments] = useState(0);
  const [chat, setChat] = useState({ unread: 0, needs: 0 });
  const [openDrafts, setDrafts] = useState(0);
  const [items, setItems] = useState<WithId<CatalogItem>[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    const offs: Array<() => void> = [];
    const today = Timestamp.fromDate(startOfToday());
    offs.push(
      onSnapshot(query(ordersRef(orgId), where('createdAt', '>=', today)), (s) => {
        setTodayOrders(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setReady(true);
      }, () => setReady(true)),
    );
    offs.push(onSnapshot(itemsRef(orgId), (s) => setItems(s.docs.map((d) => ({ id: d.id, ...d.data() })))));
    if (can(role, 'payments.verify')) {
      offs.push(onSnapshot(query(paymentsRef(orgId), where('status', '==', 'submitted')), (s) => setPayments(s.size)));
    }
    if (can(role, 'inbox.reply')) {
      offs.push(
        onSnapshot(query(customersRef(orgId), where('lastMessageAt', '>=', Timestamp.fromMillis(Date.now() - 7 * 86400000))), (s) =>
          setChat({ unread: s.docs.filter((d) => (d.data().unreadCount ?? 0) > 0).length, needs: s.docs.filter((d) => d.data().needsHuman).length }),
        ),
      );
      offs.push(onSnapshot(query(draftOrdersRef(orgId), where('status', '==', 'open')), (s) => setDrafts(s.size)));
    }
    return () => offs.forEach((off) => off());
  }, [orgId, role]);

  const value = useMemo<Live>(() => {
    const lowStock = items.filter((i) => i.kind === 'product' && i.trackStock && i.stock <= i.lowStockAt);
    return {
      todayOrders,
      takenTodayMinor: todayOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.paidMinor ?? 0), 0),
      paymentsToCheck,
      unreadChats: chat.unread,
      needsReply: chat.needs,
      openDrafts,
      items,
      lowStock,
      ready,
    };
  }, [todayOrders, paymentsToCheck, chat, openDrafts, items, ready]);

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);
