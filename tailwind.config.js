/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2F8',
          100: '#D8E0EE',
          200: '#B3C2DC',
          300: '#88A1C5',
          400: '#5A7EAE',
          500: '#3C6299',
          600: '#264B87',
          700: '#1F3D6F',
          800: '#182F57',
          900: '#112141',
          950: '#0A1428',
        },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(.96) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 150ms ease-out',
        modalIn: 'modalIn 150ms ease-out',
      },
    },
  },
  plugins: [],
};
