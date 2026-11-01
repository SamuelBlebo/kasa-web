import { createHmac, timingSafeEqual } from 'node:crypto';

/** Meta signs every webhook POST with HMAC-SHA256 of the raw body and the app secret. */
export function verifyMetaSignature(rawBody: Buffer, header: string | undefined, appSecret: string): boolean {
  if (!header?.startsWith('sha256=') || !appSecret) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const received = header.slice('sha256='.length).toLowerCase();
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
