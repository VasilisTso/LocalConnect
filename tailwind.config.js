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
      // 1. Map your semantic colors to the CSS variables
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-highlight': 'var(--color-surface-highlight)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        error: 'var(--color-error)',
      },
      // 2. Enforce strictly Inter font family per your thesis guidelines
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

