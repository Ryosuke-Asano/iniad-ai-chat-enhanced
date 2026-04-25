const path = require('node:path');
const rules = require('./webpack.rules');

module.exports = {
  entry: './src/renderer/renderer.tsx',
  target: 'electron-renderer',
  mode: 'development',
  devtool: 'source-map',
  module: { rules },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, '.webpack/renderer'),
    filename: 'renderer.js',
  },
};
