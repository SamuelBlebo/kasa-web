import type { Currency } from '@/types';

const TIMEZONE_CURRENCY: Record<string, Currency> = {
  'Africa/Accra': 'GHS',
  'Africa/Lagos': 'NGN',
  'Africa/Nairobi': 'KES',
};

/**
 * Best-effort market guess from the browser's IANA timezone, used to set
 * org.currency (and therefore plan price) silently at signup. Each of our
 * three discounted markets maps to exactly one timezone, so this is accurate
 * whenever the device clock matches the merchant's real location — anyone
 * else, or a failed read, falls back to USD.
 */
export function detectCurrency(): Currency {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_CURRENCY[timeZone] ?? 'USD';
  } catch {
    return 'USD';
  }
}
