// vendor modules
var webpack = require("webpack");
var path = require("path");

var config = {
  entry: path.resolve(__dirname, "./lib/rules/index.js"),
  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "dist-src.js",
    library: "eslint-plugin-import-comments",
    libraryTarget: "umd"
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        query: {
          presets: ["es2015"]
        }
      }
    ]
  },
  node: {
    fs: "empty"
  },
  plugins: [new webpack.optimize.UglifyJsPlugin({ minimize: true })]
};

module.exports = config;
