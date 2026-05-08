/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        /* Brand Colors from Manarah Institute Logo */
        brand: {
          primary: '#1F5A5C',
          'primary-hover': '#174548',
          'primary-light': '#2D7578',
          accent: '#D69E3F',
          'accent-hover': '#B8862E',
          'accent-light': '#F5E6CC',
          bg: '#F5F1E8',
          'bg-card': '#FFFFFF',
          'bg-section': '#FAFAF7'
        },
        /* KPI Card Variants */
        kpi: {
          'primary-bg': '#E0EBEC',
          'accent-bg': '#F5E6CC',
          'success-bg': '#D1FAE5',
          'danger-bg': '#FEE2E2'
        },
        /* Text Colors */
        text: {
          primary: '#1F2937',
          secondary: '#6B7280',
          tertiary: '#9CA3AF'
        },
        /* Helper Status Colors */
        success: {
          soft: '#D1FAE5',
          DEFAULT: '#10B981'
        },
        warning: {
          soft: '#F5E6CC',
          DEFAULT: '#D69E3F'
        },
        danger: {
          soft: '#FEE2E2',
          DEFAULT: '#EF4444'
        },
        info: {
          soft: '#E0EBEC',
          DEFAULT: '#1F5A5C'
        }
      },
      boxShadow: {
        soft: '0 10px 25px -10px rgba(31, 90, 92, 0.2)',
        card: '0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)'
      }
    }
  },
  plugins: []
};
