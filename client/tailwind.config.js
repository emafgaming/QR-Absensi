/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // LP3I Inspired Professional Institutional Design Tokens
        lp3i: {
          blue: {
            DEFAULT: '#30347F',
            hover: '#252963',
            dark: '#1C2053',
            light: '#EEF0FA',
            50: '#F4F5FB',
            100: '#EEF0FA',
            200: '#D5D9F2',
            600: '#30347F',
            700: '#252963',
            800: '#1C2053',
            900: '#14173D',
          },
          red: {
            DEFAULT: '#E52B35',
            hover: '#C81E27',
            light: '#FFF0F0',
            50: '#FFF5F5',
            100: '#FFF0F0',
            500: '#E52B35',
            600: '#C81E27',
            700: '#A5161D',
          },
          neutral: {
            bg: '#F5F6F8',
            surface: '#FFFFFF',
            text: '#202433',
            muted: '#687083',
            border: '#E1E5EC',
            50: '#F5F6F8',
            100: '#EBEEF2',
            200: '#E1E5EC',
            300: '#C9D0DC',
            400: '#9CA5B8',
            500: '#687083',
            700: '#3D4456',
            900: '#202433',
          },
          status: {
            success: '#15803D',
            'success-bg': '#ECFDF3',
            'success-border': '#A7F3D0',
            warning: '#A15C07',
            'warning-bg': '#FFF7E6',
            'warning-border': '#FDE68A',
            error: '#B42318',
            'error-bg': '#FEF3F2',
            'error-border': '#FECDD3',
          }
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(16, 24, 40, 0.06), 0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        'card': '0 2px 6px -1px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.05)',
      }
    },
  },
  plugins: [],
}
