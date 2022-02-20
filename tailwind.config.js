module.exports = {
  mode: 'jit',
  content: [
    './apps/website/pages/**/*.{js,ts,jsx,tsx}',
    './apps/website/components/**/*.{js,ts,jsx,tsx}',
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
