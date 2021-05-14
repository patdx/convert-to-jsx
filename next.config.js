// angular needs original class names
module.exports = {
    webpack: function (cfg) {
      cfg.plugins = cfg.plugins.filter(plugin => {
        return plugin.constructor.name !== 'UglifyJsPlugin';
      });
  
      return cfg
    }
  }