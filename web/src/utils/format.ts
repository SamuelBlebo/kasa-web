import type { Timestamp } from 'firebase/firestore';

export function formatMoney(amount: number, currency = 'GHS'): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value: Timestamp | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : value.toDate();
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Local (not UTC) `YYYY-MM-DDTHH:mm`, the value an `<input type="datetime-local">` needs. */
export function toDatetimeLocalInput(value: Timestamp | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : value.toDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
