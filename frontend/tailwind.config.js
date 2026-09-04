/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#fbf7f1",
          100: "#f4ebe0",
          200: "#e7d3bb",
        },
        sage: {
          600: "#3f6b5a",
          700: "#2f5244",
          800: "#243f35",
        },
        clay: {
          500: "#c45c26",
          600: "#a4481c",
        },
      },
      fontFamily: {
        sans: ["Georgia", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
