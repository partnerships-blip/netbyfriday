import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAF7F3', ink: '#32152F', muted: '#6C4B67', sub: '#5E4459', faint: '#9A8396',
        line: '#ECE4EA', line2: '#E0D5DE', soft: '#EAE5F7', soft2: '#F0EBF2', paper: '#FFFDFB',
        lavender: '#EAE5F7', chartreuse: '#DFFF43', plum: '#32152F',
        danger: '#A8402B', ok: '#2C6542',
        ac: 'var(--ac)', 'ac-ink': 'var(--ac-ink)', 'ac-text': 'var(--ac-text)', 'ac-soft': 'var(--ac-soft)'
      },
      fontFamily: {
        sans: ['var(--font-head)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        head: ['var(--hf)', 'system-ui', 'sans-serif']
      },
      borderRadius: { card: '14px' }
    }
  },
  plugins: []
} satisfies Config;
