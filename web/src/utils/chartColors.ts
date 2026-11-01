import type { Theme } from '@/context/ThemeContext';

/**
 * Recharts paints raw SVG, so it needs real color strings, not Tailwind
 * classes — these mirror the `--c-*` custom properties in index.css exactly.
 * Keep the two in sync if the palette ever changes.
 */
const CHANNELS = {
  light: { brand: '12 122 105', muted: '100 114 126', line: '224 229 233', ink: '17 24 31', surface: '255 255 255' },
  dark: { brand: '45 199 155', muted: '147 161 173', line: '42 53 61', ink: '231 237 242', surface: '22 30 35' },
} as const;

export function chartColors(theme: Theme) {
  const c = CHANNELS[theme];
  return {
    brand: `rgb(${c.brand})`,
    muted: `rgb(${c.muted})`,
    line: `rgb(${c.line})`,
    ink: `rgb(${c.ink})`,
    surface: `rgb(${c.surface})`,
  };
}
