const path = require('node:path');
const rules = require('./webpack.rules');

module.exports = {
  entry: './src/preload.ts',
  target: 'electron-preload',
  mode: 'development',
  devtool: 'source-map',
  module: { rules },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, '.webpack/preload'),
    filename: 'preload.js',
  },
};
