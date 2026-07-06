/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#070d1a',
        surface: '#0f172a',
        elevated: '#1e293b',
        border: '#1e293b',
        accent: {
          blue: '#3b82f6',
          green: '#10b981',
          red: '#f43f5e',
          amber: '#f59e0b',
        },
        txt: {
          primary: '#f1f5f9',
          secondary: '#64748b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
