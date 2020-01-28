'use strict'
const path = require('path')
const fs = require('fs')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const extFs = require('yyl-fs')
const UglifyjsWebpackPlugin = require('uglifyjs-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const webpack = require('webpack')
const extOs = require('yyl-os')
const util = require('yyl-util')

const { NODE_ENV } = process.env
const IS_COMMIT = NODE_ENV === 'production'

// + setting
const OUTPUT_DIR = path.join(__dirname, 'output')
const config = {
  proxy: {
    port: 5000,
    homePage: 'http://127.0.0.1:5000/'
  },
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
  entry: (() => {
    const iSrcRoot = path.isAbsolute(config.alias.srcRoot)
      ? config.alias.srcRoot
      : path.join(__dirname, config.alias.srcRoot)

    let r = {}

    // multi entry
    var entryPath = path.join(iSrcRoot, 'entry')

    if (fs.existsSync(entryPath)) {
      var fileList = extFs.readFilesSync(entryPath, /\.(js|tsx?)$/)
      fileList.forEach((str) => {
        var key = path.basename(str).replace(/\.[^.]+$/, '')
        if (key) {
          r[key] = [str]
        }
      })
    }

    return r
  })(),
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
  devtool: IS_COMMIT ?  false : 'source-map',
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
    }),
    new CleanWebpackPlugin()
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

// + html output
wConfig.plugins = wConfig.plugins.concat((function () { // html 输出
  const entryPath = util.path.join(config.alias.srcRoot, 'entry')
  let outputPath = []
  const r = []

  if (fs.existsSync(entryPath)) {
    outputPath = outputPath.concat(extFs.readFilesSync(entryPath, /(\.jade|\.pug|\.html)$/))
  }

  const outputMap = {}
  const ignoreExtName = function (iPath) {
    return iPath.replace(/(\.jade|\.pug|\.html|\.js|\.css|\.ts|\.tsx|\.jsx)$/, '')
  }

  outputPath.forEach((iPath) => {
    outputMap[ignoreExtName(iPath)] = iPath
  })

  const commonChunks = []
  const pageChunkMap = {}
  Object.keys(wConfig.entry).forEach((key) => {
    let iPaths = []
    if (util.type(wConfig.entry[key]) === 'array') {
      iPaths = wConfig.entry[key]
    } else if (util.type(wConfig.entry[key]) === 'string') {
      iPaths.push(wConfig.entry[key])
    }

    let isPageModule = null
    iPaths.some((iPath) => {
      const baseName = ignoreExtName(iPath)
      if (outputMap[baseName]) {
        isPageModule = baseName
        return true
      }
      return false
    })

    if (!isPageModule) {
      commonChunks.push(key)
    } else {
      pageChunkMap[isPageModule] = key
    }
  })

  outputPath.forEach((iPath) => {
    const iBaseName = ignoreExtName(iPath)
    const iChunkName = pageChunkMap[iBaseName]
    const fileName = ignoreExtName(path.basename(iPath))
    let iChunks = []

    iChunks = iChunks.concat(commonChunks)
    if (iChunkName) {
      iChunks.push(iChunkName)
    }

    if (iChunkName) {
      const opts = {
        template: iPath,
        filename: path.relative(config.alias.jsDest, path.join(config.alias.htmlDest, `${fileName}.html`)),
        chunks: iChunks,
        chunksSortMode (a, b) {
          return iChunks.indexOf(a.names[0]) - iChunks.indexOf(b.names[0])
        },
        inlineSource: '.(js|css|ts|tsx|jsx)\\?__inline$',
        minify: false
      }

      r.push(new HtmlWebpackPlugin(opts))
    }
  })

  return r
})())
// - html output

// + dev server
wConfig.devServer = {
  contentBase: config.alias.root,
  compress: true,
  port: config.proxy.port,
  hot: true,
  publicPath: config.dest.basePath,
  writeToDisk: true,
  async after () {
    if (config.proxy.homePage) {
      await extOs.openBrowser(config.proxy.homePage)
    }
  }
}
// - dev server

module.exports = wConfig
