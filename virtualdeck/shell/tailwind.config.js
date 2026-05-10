/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#1a1a1a',
        card: '#242424',
        accent: '#6366f1',
      },
    },
  },
  plugins: [],
};
