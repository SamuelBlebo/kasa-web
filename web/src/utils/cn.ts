type ClassValue = string | number | null | false | undefined | ClassValue[];

/** Minimal class-name joiner — no dependency, no merge magic. */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const v of values) {
    if (!v && v !== 0) continue;
    if (Array.isArray(v)) out.push(cn(...v));
    else out.push(String(v));
  }
  return out.filter(Boolean).join(' ');
}
