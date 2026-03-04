/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-nunito)', 'Nunito', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'Space Mono', 'monospace'],
      },
      colors: {
        green:  { DEFAULT: '#4ade80', dark: '#16a34a', glow: 'rgba(74,222,128,0.18)' },
        teal:   { DEFAULT: '#2dd4bf' },
        violet: { DEFAULT: '#a78bfa' },
        pink:   { DEFAULT: '#f472b6' },
        orange: { DEFAULT: '#fb923c' },
        sky:    { DEFAULT: '#38bdf8' },
        lime:   { DEFAULT: '#a3e635' },
        bg:     { DEFAULT: '#0b150b', 2: '#0f1c0f', 3: '#152415' },
        card:   { DEFAULT: '#172617', 2: '#1d301d' },
        border: { DEFAULT: '#253d25', 2: '#1e321e' },
        tx:     { DEFAULT: '#e8f5e8', 2: '#9dbb9d', 3: '#567856' },
      },
      boxShadow: {
        green: '0 0 30px rgba(74,222,128,0.12)',
        card:  '0 4px 24px rgba(0,0,0,0.35)',
      },
      animation: {
        'fade-up': 'fadeUp 0.35s ease backwards',
        'modal-pop': 'modalPop 0.28s cubic-bezier(.34,1.56,.64,1)',
        'pulse-slow': 'pulse 2s infinite',
      },
      keyframes: {
        fadeUp:   { from:{ opacity:'0', transform:'translateY(8px)' }, to:{ opacity:'1', transform:'translateY(0)' } },
        modalPop: { from:{ opacity:'0', transform:'scale(.88) translateY(14px)' }, to:{ opacity:'1', transform:'scale(1) translateY(0)' } },
      },
    },
  },
  plugins: [],
}
