module.exports = {
  chainWebpack: config => {
    config.module
      .rule('ts')
      .use('ts-loader')
      .loader('ts-loader')
      .tap(options => {
        options.configFile = 'tsconfig.vue.json';
        return options;
      });
  },
  css: {
    loaderOptions: {
      sass: {
        data: `@import "~@/assets/css/variables.scss";`
      }
    }
  }
};
