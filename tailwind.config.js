/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#FAF7F2',
          100: '#F7F4EE',
          200: '#EFEAE0',
          300: '#E3DCce',
          400: '#CFC5B2',
        },
        sage: {
          50: '#F1F4EE',
          100: '#E2E8DC',
          200: '#C5D2BD',
          600: '#5F7054',
          700: '#526049',
          800: '#434F3C',
          900: '#2C3527',
        },
        terracotta: {
          100: '#F7ECE6',
          400: '#D68563',
          500: '#C67451',
          600: '#B26240',
        },
        charcoal: {
          900: '#201E1B',
          800: '#32302C',
          600: '#67645E',
          400: '#9E9A92',
          200: '#D5D2CA',
        }
      },
      fontFamily: {
        serif: ['Newsreader', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      boxShadow: {
        'zen': '0 10px 30px -10px rgba(67, 79, 60, 0.08), 0 4px 12px -4px rgba(0, 0, 0, 0.04)',
        'zen-hover': '0 20px 35px -10px rgba(67, 79, 60, 0.12), 0 8px 16px -4px rgba(0, 0, 0, 0.06)',
        'dock': '0 12px 40px -8px rgba(44, 53, 39, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
