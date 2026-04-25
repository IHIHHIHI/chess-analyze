/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cls: {
          best: '#81b64c',
          excellent: '#7ab2e8',
          good: '#95a5a6',
          inaccuracy: '#f7c645',
          mistake: '#ff9a4d',
          blunder: '#fa412d',
        },
      },
    },
  },
  plugins: [],
};
