module.exports = {
  mode: 'jit',
  content: ['./apps/website/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
    // ...
  ],
};
