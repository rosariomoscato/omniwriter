/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ═══════════════════════════════════════════════════════════════
        // OMNIWRITER "COSMIC INK" DESIGN SYSTEM
        // A futuristic yet editorial aesthetic for AI-powered writing
        // ═══════════════════════════════════════════════════════════════

        // Primary - Cosmic Cyan (luminous, tech-forward)
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Accent - Electric Violet (creative, AI-inspired)
        accent: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        // Area-specific colors (enhanced for futurism)
        romanziere: '#f59e0b',
        saggista: '#14b8a6',
        redattore: '#f43f5e',
        // Dark theme - Deep cosmic palette
        dark: {
          bg: '#0a0a0f',        // Deep space black
          surface: '#12121a',    // Card backgrounds
          card: '#1a1a25',       // Elevated surfaces
          elevated: '#22222f',   // Highest elevation
          border: '#2a2a3a',     // Subtle borders
          'border-subtle': '#1f1f2a', // Very subtle borders
        },
        // Surface colors for light mode
        surface: {
          light: '#fafbfc',
          DEFAULT: '#f8f9fa',
          dark: '#12121a',
        },
        // Glow colors for effects
        glow: {
          cyan: 'rgba(6, 182, 212, 0.5)',
          violet: 'rgba(168, 85, 247, 0.5)',
          amber: 'rgba(245, 158, 11, 0.5)',
          teal: 'rgba(20, 184, 166, 0.5)',
          rose: 'rgba(244, 63, 94, 0.5)',
        },
      },
      fontFamily: {
        // DM Sans - Modern, clean UI font
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        // Crimson Pro - Elegant editorial serif for headlines
        serif: ['Crimson Pro', 'Georgia', 'serif'],
        // JetBrains Mono - Code/technical content
        mono: ['JetBrains Mono', 'monospace'],
        // Display - For special hero text
        display: ['Crimson Pro', 'Georgia', 'serif'],
      },
      // Enhanced animations for futuristic feel
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      // Backdrop blur and glass effects
      backdropBlur: {
        xs: '2px',
      },
      // Box shadow for glow effects
      boxShadow: {
        'glow-sm': '0 0 10px rgba(6, 182, 212, 0.3)',
        'glow-md': '0 0 20px rgba(6, 182, 212, 0.4)',
        'glow-lg': '0 0 40px rgba(6, 182, 212, 0.5)',
        'glow-violet': '0 0 20px rgba(168, 85, 247, 0.4)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.4)',
        'glow-teal': '0 0 20px rgba(20, 184, 166, 0.4)',
        'glow-rose': '0 0 20px rgba(244, 63, 94, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(6, 182, 212, 0.1)',
      },
      // Background gradient utilities
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'linear-gradient(135deg, rgba(6, 182, 212, 0.03) 0%, rgba(168, 85, 247, 0.03) 50%, rgba(20, 184, 166, 0.03) 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
