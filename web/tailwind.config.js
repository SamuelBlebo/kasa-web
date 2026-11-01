/** @type {import('tailwindcss').Config} */
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Kasa palette (approved in the Phase 2 prototype): cotton ground, wax indigo,
      // ochre for money and attention, leaf green for done, red only for faults.
      colors: {
        canvas: c('canvas'),
        surface: c('surface'),
        raised: c('raised'),
        line: c('line'),
        line2: c('line2'),
        ink: c('ink'),
        muted: c('muted'),
        brand: { DEFAULT: c('brand'), 2: c('brand2'), soft: c('brand-soft'), ink: c('brand-ink'), on: c('on-brand'), dim: c('on-brand-dim') },
        accent: { DEFAULT: c('accent'), soft: c('accent-soft'), ink: c('accent-ink') },
        ok: { DEFAULT: c('ok'), soft: c('ok-soft'), ink: c('ok-ink') },
        danger: { DEFAULT: c('danger'), soft: c('danger-soft') },
        // Older names some ported pages use.
        warn: c('accent-ink'),
        info: c('brand'),
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        cap: ['Bahnschrift SemiCondensed', 'Bahnschrift', 'Roboto Condensed', 'Arial Narrow', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'Cascadia Mono', 'Consolas', 'monospace'],
      },
      borderRadius: { xl: '0.75rem', '2xl': '1rem' },
      boxShadow: {
        card: '0 1px 2px rgb(45 32 8 / 0.06), 0 8px 24px -12px rgb(45 32 8 / 0.22)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in': { from: { opacity: '0', transform: 'translateX(32px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-in': 'slide-in 280ms cubic-bezier(.16,1,.3,1)',
      },
    },
  },
  plugins: [],
};
