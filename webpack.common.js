const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');

module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.html$/,
        loader: 'html-loader'
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: 'src/index.html'
    }),
    new WorkboxPlugin.GenerateSW({
      // these options encourage the ServiceWorkers to get in there fast
      // and not allow any straggling "old" SWs to hang around
      clientsClaim: true,
      skipWaiting: true
    }),
    new WebpackPwaManifest({
      short_name: 'Serial Terminal',
      name: 'Serial Terminal',
      icons: [
        {
          src: path.resolve('src/images/icons-1024.png'),
          type: 'image/png',
          sizes: '1024x1024',
          purpose: 'any maskable'
        },
        {
          src: path.resolve('src/images/icons-192.png'),
          type: 'image/png',
          sizes: '192x192',
          purpose: 'any maskable'
        },
        {
          src: path.resolve('src/images/icons-512.png'),
          type: 'image/png',
          sizes: '512x512',
          purpose: 'any maskable'
        }
      ],
      start_url: './?source=pwa',
      display: 'standalone',
      scope: './'
    })
  ],
  resolve: {
    extensions: [ '.ts', '.js' ]
  },
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '.'
  },
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  }
};
