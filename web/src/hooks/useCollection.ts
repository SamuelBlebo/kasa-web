import { useEffect, useState } from 'react';
import { onSnapshot, type Query } from 'firebase/firestore';
import type { AsyncState, WithId } from '@/types';
import { toMessage } from '@/utils/errors';

/**
 * Subscribes to a Firestore query and returns it as a discriminated state.
 * Pass a memoised query — an inline one re-subscribes on every render.
 */
export function useCollection<T>(query: Query<T> | null): AsyncState<WithId<T>[]> {
  const [state, setState] = useState<AsyncState<WithId<T>[]>>({ status: 'idle' });

  useEffect(() => {
    if (!query) {
      setState({ status: 'idle' });
      return;
    }
    setState({ status: 'loading' });
    return onSnapshot(
      query,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setState({ status: 'ready', data });
      },
      (error) => setState({ status: 'error', error: toMessage(error) }),
    );
  }, [query]);

  return state;
}
