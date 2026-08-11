import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          100: '#E7EAEF',
          300: '#94A3B8',
          500: '#2B3A55',
          700: '#1D2A3F',
          900: '#141C2B',
        },
        parchment: {
          100: '#FFFDF9',
          300: '#F7F2E9',
          500: '#E9E1D2',
          700: '#D8D0BF',
          900: '#1C1A16',
        },
        sage: {
          100: '#E5EBE4',
          300: '#B4C6B2',
          500: '#8FA98C',
          700: '#5F7A5D',
          900: '#3A4C39',
        },
        amber: {
          100: '#F5E6D0',
          300: '#DDB077',
          500: '#C98A3E',
          700: '#9C6725',
          900: '#5F3E15',
        },
        terracotta: {
          100: '#F3DDD3',
          300: '#DB9F8A',
          500: '#C1704F',
          700: '#954F34',
          900: '#5C3020',
        },
        charcoal: {
          100: '#F4F4F3',
          300: '#9B9A96',
          500: '#5C5B57',
          700: '#2E2E2E',
          900: '#0F0F0E',
        },
        error: '#A33D3D',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-source-serif)', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
