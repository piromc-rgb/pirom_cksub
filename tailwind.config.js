/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        felo: {
          bg: '#0a0d14',
          surface: '#121722',
          card: '#181f2e',
          border: '#252e42',
          primary: '#4f46e5',
          accent: '#06b6d4',
          highlight: '#38bdf8',
          success: '#10b981',
          warning: '#f59e0b',
          muted: '#8b9bb4'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Prompt', 'Kanit', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
