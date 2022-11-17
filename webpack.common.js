const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: { configurator: './src/index.js', demo: './demo/index.js' },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.js', '.json'],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.THREEKIT_AUTH_TOKEN': JSON.stringify(
        process.env.THREEKIT_AUTH_TOKEN
      ),
      'process.env.THREEKIT_ENV': JSON.stringify(process.env.THREEKIT_ENV),
    }),
  ],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
};
