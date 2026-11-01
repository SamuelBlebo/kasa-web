import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { callWithRetry } from '@/utils/callWithRetry';

/**
 * Calls a Cloud Function by name. Everything that moves money or stock, or
 * touches WhatsApp, goes through one of these; the server re-checks the
 * caller's business and role every time.
 */
export async function call<I, O = unknown>(name: string, data?: I, retry = false): Promise<O> {
  const fn = httpsCallable<I, O>(functions, name);
  const run = async () => (await fn(data as I)).data;
  return retry ? callWithRetry(run) : run();
}
