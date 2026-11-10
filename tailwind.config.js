/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"WCA Proxima Verified"', '"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['"WCA Source Serif Verified"', '"Source Serif 4"', 'Georgia', 'serif'],
      },
      colors: {
        wca: {
          red: '#ce1226',       // Official WCA Trojan Crimson (--nsm-primary)
          reddark: '#a50e1e',   // Official WCA Darker Crimson (--nsm-primary-600)
          reddeep: '#7c0b17',   // Official WCA Deep Crimson (--nsm-primary-700)
          gold: '#ffde6a',      // Official WCA Trojan Gold (--nsm-secondary)
          golddark: '#ccb255',  // Official WCA Rich Gold (--nsm-secondary-600)
          charcoal: '#141414',  // Official WCA Header Charcoal
          dark: '#212529',      // Official WCA Dark (--nsm-dark)
          slate: '#F5F5F5',     // Official WCA Light Gray (--nsm-light)
          border: '#E2E8F0'
        }
      }
    },
  },
  plugins: [],
}
