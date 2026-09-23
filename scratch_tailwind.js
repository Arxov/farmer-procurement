const fs = require('fs');

const tailwindConfig = \/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        chassis: 'var(--chassis)',
        panel: 'var(--panel)',
        muted: 'var(--muted)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
        }
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'floating': 'var(--shadow-floating)',
        'pressed': 'var(--shadow-pressed)',
        'recessed': 'var(--shadow-recessed)',
        'glow': 'var(--shadow-glow)',
      },
      transitionTimingFunction: {
        'spring': 'var(--ease-spring)',
      }
    },
  },
  plugins: [],
};
\;

fs.writeFileSync('tailwind.config.js', tailwindConfig);
console.log('tailwind.config.js updated');

