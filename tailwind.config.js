/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./electron/**/*.{js,ts}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        win: {
          primary: '#0066CC',
          hover: '#005FB8',
          pressed: '#0053A4',
          bg: 'var(--win-bg)', 
          panel: 'var(--win-panel)',
          surface: 'var(--win-surface)',
          'surface-hover': 'var(--win-surface-hover)',
          'surface-active': 'var(--win-surface-active)',
          border: 'var(--win-border)',
          'border-active': 'var(--win-border-active)',
          text: 'var(--win-text)',
          subtext: 'var(--win-subtext)',
          muted: 'var(--win-muted)',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', '"Microsoft YaHei"', 'Inter', 'Roboto', 'sans-serif'],
      },
      transitionTimingFunction: {
        'fluent': 'cubic-bezier(0.2, 0, 0.1, 1)',
        'micro': 'cubic-bezier(0, 0, 0.2, 1)',
      },
      transitionDuration: {
        '400': '400ms',
      },
      keyframes: {
        winOpen: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        winClose: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        slideUpFluent: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseFluent: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      },
      animation: {
        'win-open': 'winOpen 0.4s cubic-bezier(0.2, 0, 0.1, 1) forwards',
        'win-close': 'winClose 0.25s cubic-bezier(0.2, 0, 0.1, 1) forwards',
        'slide-up-fluent': 'slideUpFluent 0.3s cubic-bezier(0.2, 0, 0.1, 1) forwards',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-left': 'slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-fluent': 'pulseFluent 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        'win-elevation': '0 4px 12px var(--shadow-color), 0 0 2px rgba(0,0,0,0.1)',
        'win-inner': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }
    }
  },
  plugins: [],
}