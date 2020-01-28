'use strict'
const path = require('path')
const UglifyjsWebpackPlugin = require('uglifyjs-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpack = require('webpack')
const util = require('yyl-util')

const { NODE_ENV } = process.env
const IS_COMMIT = NODE_ENV === 'production'

// + setting
const OUTPUT_DIR = path.join(__dirname, 'output')
const config = {
  alias: {
    dirname: __dirname,
    root: OUTPUT_DIR,
    srcRoot: path.join(__dirname, 'src'),

    jsDest: OUTPUT_DIR,
    htmlDest: OUTPUT_DIR,
    cssDest: OUTPUT_DIR,
    imagesDest: OUTPUT_DIR
  },
  dest: {
    basePath: '/'
  },
  concat: {}
}
// - setting

const wConfig = {
  mode: 'development',
  entry: {
    'index': path.join(__dirname, 'src/index.ts')
  },
  output: {
    path: path.resolve(__dirname, config.alias.jsDest),
    filename: '[name].js',
    chunkFilename: 'async_component/[name].js',
    publicPath: util.path.join(
      config.dest.basePath,
      path.relative(
        config.alias.root,
        config.alias.jsDest
      ),
      '/'
    )
  },
  module: {
    rules: [{
      test: /\.jsx?$/,
      exclude: (file) => (
        /node_modules/.test(file)
      ),
      use: (() => {
        const loaders = [{
          loader: 'babel-loader',
          query: (() => {
            if (!config.babelrc) {
              return {
                babelrc: false,
                cacheDirectory: true
              }
            } else {
              return {}
            }
          })()
        }]

        return loaders
      })()
    }, {
      test: /\.html$/,
      use: [{
        loader: 'html-loader'
      }]
    }, {
      test: /\.pug$/,
      oneOf: [{
        use: ['pug-loader']
      }]
    }, {
      test: /\.(png|jpg|gif)$/,
      use: {
        loader: 'url-loader',
        options: {
          limit: 100000,
          name: '[name].[ext]',
          chunkFilename: 'async_component/[name].js',
          outputPath: path.relative(
            config.alias.jsDest,
            config.alias.imagesDest
          ),
          publicPath: (function () {
            let r = util.path.join(
              config.dest.basePath,
              path.relative(
                config.alias.root,
                config.alias.imagesDest
              ),
              '/'
            )
            return r
          })()
        }
      }
    }, {
      test: /\.css$/,
      use: [{
        loader: MiniCssExtractPlugin.loader,
        options: {}
      }, {
        loader: 'css-loader'
      }]
    }, {
      test: /\.tsx?$/,
      loader: 'ts-loader'
    }]
  },
  resolveLoader: {
    modules: [
      path.join(__dirname, 'node_modules')
    ]
  },
  resolve: {
    modules: [
      path.join(__dirname, 'node_modules')
    ],
    alias: config.alias
  },
  devtool: IS_COMMIT ? false : 'source-map',
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    // 样式分离插件
    new MiniCssExtractPlugin({
      filename: util.path.join(
        path.relative(
          config.alias.jsDest,
          path.join(config.alias.cssDest, '[name].css')
        )
      ),
      chunkFilename: '[name].css',
      allChunks: true
    })
  ],
  optimization: {
    minimizer: [
      new UglifyjsWebpackPlugin({
        uglifyOptions: {
          ie8: false
        }
      }),
      new OptimizeCSSAssetsPlugin({})
    ]
  }
}

module.exports = wConfig
