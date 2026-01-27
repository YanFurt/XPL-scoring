// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');
//import path from 'path'
//import HtmlWebpackPlugin from 'html-webpack-plugin'

module.exports = {
    entry: path.join(__dirname, "src", "index.jsx"),
    output: {
      path:path.resolve(__dirname, "dist"),
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.join(__dirname, "public", "index.html"),
      }),
      new Dotenv({
        path: path.resolve(__dirname, '.env'),
      })
    ],
    module: {
        rules: [
          {
            test: /\.?(ts|js|tsx|jsx)$/,
            exclude: /node_modules/,
            use: {
              loader: "babel-loader",
              options: {
                presets: ['@babel/preset-env', '@babel/preset-react']
              }
            }
          },
          {
            test: /\.css$/,
            use: ['style-loader', 'css-loader'],
          },
          {
            test: /\.mp3$/,

            loader: 'file-loader'
          }
        ]
      },
  devServer: {
    port: 3000,
  },
};
