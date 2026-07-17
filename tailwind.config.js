module.exports = {
  darkMode: 'class', // enable dark mode via class
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(210, 70%, 55%)',
        secondary: 'hsl(210, 30%, 20%)',
        accent: 'hsl(45, 80%, 60%)',
        glass: 'rgba(255,255,255,0.1)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
      },
    },
  },
  plugins: [],
};
