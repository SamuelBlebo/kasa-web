/** All money is integer pesewas. These are the only conversions. */
export const toMinor = (cedis: number) => Math.round(cedis * 100);

export function formatCedis(minor: number): string {
  return `GH₵ ${(minor / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Reads a cedi amount out of a customer's message: "paid 50 cedis",
 * "GHS 45.50", "₵100", "gh₵ 20". Returns pesewas, or null if none found.
 */
export function parseCedis(text: string): number | null {
  const m =
    text.match(/(?:gh[s₵c]|₵|cedis?)\s*([0-9]+(?:[.,][0-9]{1,2})?)/i) ??
    text.match(/([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:gh[s₵c]|₵|cedis?)/i);
  if (!m) return null;
  const value = Number(m[1].replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? toMinor(value) : null;
}
