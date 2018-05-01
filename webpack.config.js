// vendor modules
var webpack = require("webpack");
var path = require("path");
var UglifyJsPlugin = require("uglifyjs-webpack-plugin");

var config = {
  entry: path.resolve(__dirname, "./lib/index.js"),
  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "dist-src.js",
    libraryTarget: 'umd',
    globalObject: 'this',
    library: 'eslintPluginImportComments'
  },
  mode: "production",
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "env",
                {
                  targets: {
                    node: "current",
                    uglify: true
                  }
                }
              ]
            ]
          }
        }
      }
    ]
  },
  target: "node",
  optimization: {
    minimizer: [
      // we specify a custom UglifyJsPlugin here to get source maps in production
      new UglifyJsPlugin({
        cache: true,
        parallel: true,
        uglifyOptions: {
          compress: false,
          ecma: 6,
          mangle: true
        },
        sourceMap: true
      })
    ]
  }
};

module.exports = config;
