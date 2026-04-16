/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f7ff',
          100: '#deecff',
          200: '#bfd9ff',
          300: '#91bbff',
          400: '#5b93ff',
          500: '#356dff',
          600: '#1f51f0',
          700: '#1940d3',
          800: '#1c37aa',
          900: '#1d3385'
        }
      },
      boxShadow: {
        soft: '0 10px 25px -10px rgba(14, 24, 70, 0.2)'
      }
    }
  },
  plugins: []
};
