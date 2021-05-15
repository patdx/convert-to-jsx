const { merge } = require('webpack-merge');

module.exports = {
  future: {
    webpack5: false,
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {

    // const merged = merge(config, {
    //   resolve: {
    //     fallback: {
    //       fs: "empty"
    //     }
    //   }
    // })

    // console.log(merged);

    return config;
  },
};
