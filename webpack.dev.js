const merge = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: './build',
    open: true,
    openPage: 'index.html',
    disableHostCheck: true,
    // publicPath: '/dist/', // this is a virtual path created dynamically by webpack dev server, but we make it match the "real" bundle path so we can just reuse the same html for dev and prod
    port: 8000,
    watchContentBase: true,
  },
  output: {
    publicPath: '/',
  },
});
