/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs", "./public/**/*.js"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Colores exactos de animeav1.com
        body: 'rgb(19, 19, 23)',
        text: 'rgb(135, 138, 168)',
        lead: 'rgb(255, 255, 255)',
        subs: 'rgb(167, 172, 209)',
        fore: 'rgb(0, 0, 0)',
        main: 'rgb(60, 236, 214)',
        tone: 'rgb(192, 132, 252)',
        mark: 'rgb(251, 146, 60)',
        mute: 'rgb(26, 27, 37)',
        soft: 'rgb(33, 36, 51)',
        line: 'rgb(48, 52, 74)',
        edge: 'rgb(64, 69, 98)',
        fire: 'rgb(248, 113, 113)',
        warn: 'rgb(216, 195, 111)',
        wins: 'rgb(74, 222, 128)',
        info: 'rgb(96, 165, 250)',
        back: 'rgb(26, 27, 37)'
      },
      fontFamily: {
        'satoshi': ['Satoshi', 'sans-serif'],
        'sans': ['Satoshi', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      aspectRatio: {
        'poster': '1/1.5',
        'video': '16/9'
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem'
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fadeIn': 'fadeIn 0.2s both',
        'fadeUp': 'fadeUp 0.2s both'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateZ(0)' }
        }
      }
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.bg-cut-l': {
          'mask': 'linear-gradient(to left, rgba(19, 19, 23, 1), rgba(19, 19, 23, 0))',
          '-webkit-mask': 'linear-gradient(to left, rgba(19, 19, 23, 1), rgba(19, 19, 23, 0))'
        },
        '.bg-cut-r': {
          'mask': 'linear-gradient(to right, rgba(19, 19, 23, 1), rgba(19, 19, 23, 0))',
          '-webkit-mask': 'linear-gradient(to right, rgba(19, 19, 23, 1), rgba(19, 19, 23, 0))'
        },
        '.bg-cut-y': {
          'mask': 'linear-gradient(to top, rgba(19, 19, 23, 0), rgba(19, 19, 23, 1) 50%, rgba(19, 19, 23, 0))',
          '-webkit-mask': 'linear-gradient(to top, rgba(19, 19, 23, 0), rgba(19, 19, 23, 1) 50%, rgba(19, 19, 23, 0))'
        },
        '.bg-radial-closest-side': {
          'background-image': 'radial-gradient(closest-side, var(--tw-gradient-stops))'
        }
      })
    }
  ],
}