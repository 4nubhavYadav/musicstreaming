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
          50: '#121212',  // elevated cards, dock, sheets, modals
          100: '#000000', // completely black background
          200: '#1C1C1C', // hover / active cards
          300: '#2A2A2A', // borders / divider lines / tracks
          400: '#3D3D3D',
        },
        sage: {
          50: '#141412',
          100: '#22201B',
          200: '#353127',
          300: '#4A4437',
          400: '#C7B9A2',
          600: '#D0C4AF', // warm beige progress line
          700: '#E8DFD1', // primary beige button disc
          800: '#DDD2BF', // primary beige button hover
          900: '#000000', // black icon on solid beige button
        },
        terracotta: {
          50: '#261712',
          100: '#341E16',
          200: '#5A2E20',
          400: '#E28666',
          500: '#E87A54',
          600: '#F09270',
          800: '#F8B197',
          900: '#FCE0D6',
        },
        charcoal: {
          900: '#F5EFEB', // primary crisp warm beige font
          800: '#E8DFD1', // secondary warm beige font & strong icons
          700: '#DDD2C1', // tertiary beige
          600: '#D0C4AF', // medium beige font
          500: '#B8AB96', // muted beige font
          400: '#9C8F7A', // soft beige icons & captions
          200: '#2A2722', // subtle dark beige borders
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
        'zen': '0 10px 30px -10px rgba(0, 0, 0, 0.7), 0 4px 12px -4px rgba(0, 0, 0, 0.4)',
        'zen-hover': '0 20px 35px -10px rgba(0, 0, 0, 0.8), 0 8px 16px -4px rgba(0, 0, 0, 0.5)',
        'dock': '0 12px 40px -8px rgba(0, 0, 0, 0.9), 0 2px 10px rgba(0, 0, 0, 0.6)',
      }
    },
  },
  plugins: [],
}
