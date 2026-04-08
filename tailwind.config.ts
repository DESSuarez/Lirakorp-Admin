import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#f5f5f5', 100: '#e8e8e8', 200: '#d1d1d1', 300: '#a3a3a3', 400: '#6b6b6b', 500: '#3d3d3d', 600: '#2B2B2B', 700: '#232323', 800: '#1E1E1E', 900: '#141414' },
        brand: { blue: '#1E3FA8' },
        accent: { 50: '#faf7f2', 100: '#f3ece0', 200: '#e8d9c2', 300: '#d9c3a0', 400: '#C5A47E', 500: '#b8935e', 600: '#a07a47', 700: '#86643b', 800: '#6d5133', 900: '#5a432c' },
        warning: { 50: '#fffbeb', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
        danger: { 50: '#fef2f2', 400: '#f87171', 500: '#ef4444', 600: '#dc2626' },
      },
    },
  },
  plugins: [],
}
export default config
