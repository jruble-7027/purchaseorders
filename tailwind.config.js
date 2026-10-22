/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wca: {
          navy: '#0C2340',     // Classic collegiate navy
          blue: '#1D4ED8',
          gold: '#C59B27',     // Trojan gold accent
          goldlight: '#F59E0B',
          slate: '#F8FAFC',
          border: '#E2E8F0'
        }
      }
    },
  },
  plugins: [],
}
