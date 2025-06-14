/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // or 'media'
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./components.tsx",
    "./TopCategoryNav.tsx",
    "./MediaCarousel.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-background': '#121212',
        'brand-surface': '#1e1e1e',
        'brand-primary': '#3498db',
        'brand-secondary': '#e74c3c',
        'brand-text-primary': '#ffffff',
        'brand-text-secondary': '#b3b3b3',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 