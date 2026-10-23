/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        axa: {
          DEFAULT: '#00008F',
          panel: '#0b2a6b',
          primary: '#3056D3',
          primaryDark: '#2748b8',
          red: '#FF1721',
        },
        page: '#f3f5f9',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
