/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  darkMode: 'class', // for seniormode
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
        },
        'on-primary': 'var(--color-on-primary)',     // <-- NEW
        secondary: 'var(--color-secondary)',
        'on-secondary': 'var(--color-on-secondary)', // <-- NEW
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-highlight': 'var(--color-surface-highlight)',
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
        },
        border: 'var(--color-border)',
        error: 'var(--color-error)',
        success: 'var(--color-success)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderWidth: {
        'senior': '4px',
      }
    },
  },
  plugins: [],
}