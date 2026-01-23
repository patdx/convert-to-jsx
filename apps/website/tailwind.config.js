module.exports = {
  mode: 'jit',
  content: [
    './apps/website/index.html',
    './apps/website/src/**/*.{js,ts,jsx,tsx}',
  ],
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
