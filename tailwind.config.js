module.exports = {
  mode: 'jit',
  purge: [
    './apps/website/pages/**/*.{js,ts,jsx,tsx}',
    './apps/website/components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: false, // or 'media' or 'class'
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
