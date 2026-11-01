import { useEffect, useState } from 'react';
import { onSnapshot, type DocumentReference } from 'firebase/firestore';
import type { AsyncState, WithId } from '@/types';
import { toMessage } from '@/utils/errors';

export function useDocument<T>(ref: DocumentReference<T> | null): AsyncState<WithId<T> | null> {
  const [state, setState] = useState<AsyncState<WithId<T> | null>>({ status: 'idle' });

  useEffect(() => {
    if (!ref) {
      setState({ status: 'idle' });
      return;
    }
    setState({ status: 'loading' });
    return onSnapshot(
      ref,
      (snap) =>
        setState({
          status: 'ready',
          data: snap.exists() ? { id: snap.id, ...snap.data() } : null,
        }),
      (error) => setState({ status: 'error', error: toMessage(error) }),
    );
  }, [ref]);

  return state;
}
