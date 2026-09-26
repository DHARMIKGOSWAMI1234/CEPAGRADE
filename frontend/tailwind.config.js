/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Action & Identity (Editorial Pink system)
        brand: {
          50: '#FDF2F8',   // Soft Pink
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',  // Bright Pink (Dark mode accent)
          500: '#EC4899',  // Primary Pink
          600: '#DB2777',  // Deep Pink (Active / Hover)
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843',
          950: '#500724',
        },
        // Dedicated dark surfaces
        appDark: {
          bg: '#050505',
          surface: '#0D0D0F',
          card: '#121214',
          elevated: '#18181B',
          border: '#27272A',
          text: '#FAFAFA',
          muted: '#A1A1AA',
        },
        // Dedicated light surfaces
        appLight: {
          bg: '#FFFFFF',
          surface: '#FAFAFA',
          card: '#FFFFFF',
          elevated: '#FFFFFF',
          border: '#F3E8EF',
          text: '#18181B',
          muted: '#71717A',
        },
        // Semantic Domain Colors
        status: {
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#DC2626',
        },
        // Computer Vision Segmentation Class Reticles
        onion: {
          red: '#c026d3',
          redLight: '#fae8ff',
          redDark: '#701a75',
          yellow: '#d97706',
          yellowLight: '#fef3c7',
          yellowDark: '#78350f',
          reference: '#0891b2',
          referenceLight: '#cffafe',
          referenceDark: '#164e63',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'soft-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'soft-md': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.03)',
        'glow-pink': '0 0 24px -4px rgba(236, 72, 153, 0.25)',
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
}
