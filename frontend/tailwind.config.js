/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        attendx: {
          navy: '#0F2A5F',       // Deep Navy
          blue: '#2563EB',       // Royal Blue
          cyan: '#06B6D4',       // Cyan Accent
          bg: '#F5F9FF',         // Application Background
          card: '#FFFFFF',       // Card Background
          success: '#16A34A',    // Success Green
          warning: '#F59E0B',    // Warning Amber
          danger: '#DC2626',     // Danger Red
          text: '#172033',       // Main Text
          muted: '#64748B',      // Secondary Text
          border: '#E2E8F0',     // Subtle Borders
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
      },
      boxShadow: {
        'attendx': '0 4px 20px -2px rgba(15, 42, 95, 0.06), 0 2px 6px -1px rgba(15, 42, 95, 0.04)',
        'attendx-lg': '0 10px 30px -4px rgba(15, 42, 95, 0.1), 0 4px 10px -2px rgba(15, 42, 95, 0.05)',
      }
    },
  },
  plugins: [],
}
