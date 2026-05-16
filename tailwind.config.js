/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Surfaces
        cream: {
          DEFAULT: '#F7F4ED',
          50: '#FBFAF5',
          100: '#F7F4ED',
          200: '#EFEADC',
          300: '#E5E0D2',
        },
        ink: {
          DEFAULT: '#15140F',
          900: '#15140F',
          800: '#1F1E18',
          700: '#3A372F',
          600: '#5C584D',
          500: '#7A766B',
          400: '#9C9789',
          300: '#B8B3A6',
          200: '#D6D1C2',
          100: '#E5E0D2',
        },
        // Brand accent — verde institucional
        verde: {
          DEFAULT: '#1F5E3F',
          900: '#0F2F1F',
          800: '#173F2A',
          700: '#1F5E3F',
          600: '#2D7C56',
          500: '#3DA071',
          400: '#6BC18F',
          300: '#9DD9B5',
          200: '#C8EAD4',
          100: '#E5F4EB',
        },
        // Semantic
        success: '#1F5E3F',
        warning: '#B88600',
        danger: '#B23A2E',
        info: '#2C5BA3',
      },
      fontFamily: {
        sans: ['System'],
        mono: ['SpaceMono', 'monospace'],
      },
      fontSize: {
        // Compact display scale
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.5px' }],
        xs: ['11px', { lineHeight: '15px' }],
        sm: ['13px', { lineHeight: '18px' }],
        base: ['15px', { lineHeight: '22px' }],
        lg: ['17px', { lineHeight: '24px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '30px', letterSpacing: '-0.3px' }],
        '3xl': ['32px', { lineHeight: '36px', letterSpacing: '-0.5px' }],
        '4xl': ['40px', { lineHeight: '44px', letterSpacing: '-0.8px' }],
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      spacing: {
        '4.5': '18px',
      },
    },
  },
  plugins: [],
};
