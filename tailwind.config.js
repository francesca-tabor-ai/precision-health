/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          cream: '#FAF8F5',
          text: '#402A2F',
          button: {
            light: '#E7E6E3',
            medium: '#D8D0C1',
            dark: '#CEC7BF',
          },
        },
      },
      fontFamily: {
        heading: ['"Bebas Neue"', 'sans-serif'],
        body: ['Rubik', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
