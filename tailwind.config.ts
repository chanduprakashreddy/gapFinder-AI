import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F2F5F7',
        surface: '#FFFFFF',
        ink: '#14212B',
        muted: '#51626F',
        line: '#D3DCE2',
        brand: '#0F5F66',
        weak: '#B3261E',
        medium: '#E0A526',
        strong: '#2E7D52',
        untested: '#8D9BA5',
      },
      fontFamily: {
        sans: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-read)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
