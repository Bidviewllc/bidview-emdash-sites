/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: '#2D5F4E', dark: '#1F4437', light: '#EAF1EE' },
        'forest-light': '#EAF1EE',
        primary: '#2D5F4E',
        'primary-dark': '#1F4437',
        'primary-tint': '#EAF1EE',
        secondary: '#F4EDE4',
        sand: '#F4EDE4',
        accent: '#E8735A',
        'accent-tint': '#FCEDEA',
        coral: '#E8735A',
        success: '#4A9B6E',
        'success-tint': '#E6F3EB',
        sage: '#4A9B6E',
        ink: '#1A2332',
        slate: '#5A6472',
        fog: '#F7F9FB',
        mist: '#E3E8EE',
        neutral: {
          ink: '#1A2332',
          slate: '#5A6472',
          fog: '#F7F9FB',
          mist: '#E3E8EE',
        },
      },
      fontFamily: {
        headline: ['Newsreader', 'serif'],
        serif: ['Newsreader', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.75rem',
        lg: '1rem',
        full: '9999px',
      },
      boxShadow: {
        soft: '0 2px 8px rgba(26, 35, 50, 0.06)',
        elevated: '0 8px 24px rgba(26, 35, 50, 0.10)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
