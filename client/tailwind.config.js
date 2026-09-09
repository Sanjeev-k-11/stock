/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8F9FC",
        surface: "rgba(255, 255, 255, 0.75)",
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        accent: {
          purple: '#7C3AED',
          indigo: '#6366F1',
          cyan: '#06B6D4'
        },
        slate: {
          850: '#151f32',
          900: '#0f172a'
        },
        stock: {
          buy: '#16A34A',
          watch: '#F59E0B',
          avoid: '#DC2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
        'glass-hover': '0 14px 40px 0 rgba(99, 102, 241, 0.14)',
        'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.35)',
        'glow-green': '0 0 20px -3px rgba(22, 163, 74, 0.3)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
