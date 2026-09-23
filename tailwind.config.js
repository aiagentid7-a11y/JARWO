/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        slate: {
          50: 'var(--text-primary)',
          100: 'var(--text-primary)',
          200: 'var(--text-secondary)',
          300: 'var(--text-secondary)',
          400: 'var(--text-muted)',
          500: 'var(--text-light)',
          800: 'var(--border-card)',
          850: 'var(--border-card-inner)',
          900: 'var(--bg-card)',
          950: 'var(--bg-card-inner)',
        },
      },
    },
  },
  plugins: [],
};
