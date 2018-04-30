// vendor modules
var webpack = require("webpack");
var path = require("path");

var config = {
  entry: path.resolve(__dirname, "./tests/lib/rules/index.js"),
  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "dist-tests.js"
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["es2015"]
          }
        }
      }
    ]
  },
  target: "node",
  plugins: [new webpack.optimize.UglifyJsPlugin({ minimize: true })]
};

module.exports = config;
