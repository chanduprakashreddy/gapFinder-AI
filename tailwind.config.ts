import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#0c1117',
        surface: '#141c25',
        'surface-elevated': '#1a242f',
        ink: '#e2e8f0',
        muted: '#8494a7',
        line: 'rgba(255, 255, 255, 0.08)',
        brand: '#0f5f66',
        'brand-light': '#1a8a7a',
        'brand-glow': 'rgba(15, 95, 102, 0.15)',
        weak: '#ef4444',
        medium: '#f59e0b',
        strong: '#10b981',
        untested: '#475569',
      },
      fontFamily: {
        sans: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-read)', 'Georgia', 'serif'],
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.08)',
        'glow': '0 0 30px rgba(15, 95, 102, 0.2)',
        'elevated': '0 8px 40px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #0a4a50 0%, #0f5f66 40%, #1a8a7a 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0c1117 0%, #141c25 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
} satisfies Config;
