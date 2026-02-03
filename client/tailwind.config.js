/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#050505',
        foreground: '#f5f5f5',
        surface: {
          base: '#050505',
          raised: '#0d0d0d',
          overlay: '#141414',
        },
        border: '#1f2937',
        input: '#1f2937',
        muted: {
          DEFAULT: '#121212',
          foreground: '#9ca3af',
        },
        primary: {
          DEFAULT: '#38bdf8',
          foreground: '#03111a',
        },
        secondary: {
          DEFAULT: '#1f2937',
          foreground: '#e5e7eb',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#fee2e2',
        },
        accent: {
          DEFAULT: '#38bdf8',
          foreground: '#03111a',
        },
        ring: '#38bdf8',
        park: {
          navy: '#050505',
          blue: '#38bdf8',
          mint: '#38bdf8',
          sky: '#38bdf8',
        },
        'dark-bg': '#050505',
        'dark-card': '#0d0d0d',
      },
      borderRadius: {
        lg: '0.875rem',
        xl: '1.25rem',
        '2xl': '1.75rem',
      },
      boxShadow: {
        subtle: '0 10px 40px rgba(8, 112, 184, 0.12)',
        card: '0 18px 60px rgba(0, 0, 0, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

