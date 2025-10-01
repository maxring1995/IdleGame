import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ffd700',
          dark: '#d4af37',
        },
        bg: {
          dark: '#0f0f0f',
          panel: 'rgba(20, 20, 30, 0.85)',
          card: 'rgba(30, 30, 40, 0.7)',
          'card-hover': 'rgba(40, 40, 50, 0.85)',
        },
      },
    },
  },
  plugins: [],
}
export default config
