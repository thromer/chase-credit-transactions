const path = require('path');

const commonConfig = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'commonjs2'
    },
    clean: true,
    sourceMapFilename: '[file].map'
  },
};

const productionConfig = {
  ...commonConfig,
  mode: 'production',
  devtool: 'source-map',
  optimization: {
    minimize: true,
  },
};

const developmentConfig = {
  ...commonConfig,
  mode: 'development',
  devtool: 'source-map',
  optimization: {
    minimize: false,
  },
};

module.exports = (env, argv) => {
  if (argv.mode === 'development') {
    return developmentConfig;
  }
  return productionConfig; // Default to production mode
};