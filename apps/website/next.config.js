// eslint-disable-next-line @typescript-eslint/no-var-requires
const withNx = require('@nx/next/plugins/with-nx');
const path = require('path');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  nx: {
    // Set this to false if you do not want to use SVGR
    // See: https://github.com/gregberge/svgr
    svgr: false,
  },
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // config.resolve.fallback.fs = false;
      config.resolve.alias = {
        ...config.resolve.alias,
        fs: path.resolve(__dirname, './src/utils/fs.ts'),
        resolve: path.resolve(__dirname, './src/utils/stubs/resolve.ts'),
      };
    }
    return config;
  },
};

module.exports = withNx(nextConfig);
