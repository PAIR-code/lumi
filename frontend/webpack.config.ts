/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import CopyWebpackPlugin from 'copy-webpack-plugin';
import {Configuration} from 'webpack';
import {GitRevisionPlugin} from 'git-revision-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import * as path from 'path';
import * as webpack from 'webpack';

const gitRevisionPlugin = new GitRevisionPlugin({branch: true});

export default (
  env: Record<string, string>,
  argv: {mode?: string},
): Configuration => {
  const isProd = argv.mode === 'production';

  return {
    entry: './src/index.ts',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          loader: path.resolve(__dirname, './lit-css-loader.js'),
        },
        {
          test: /\.scss$/,
          exclude: /node_modules/,
          use: [
            {
              loader: './lit-css-loader.js',
            },
            {
              loader: 'sass-loader',
              options: {
                api: 'modern-compiler',
                sassOptions: {
                  outputStyle: 'compressed',
                },
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        filename: 'index.html',
        favicon: './favicon.png',
        // Prepend an optional prefix path to the base URL of referenced assets in index.html
        base: process.env.URL_PREFIX ?? '/',
      }),
      new webpack.DefinePlugin({
        'process.env.URL_PREFIX': process.env.URL_PREFIX ?? "'/'",
        GIT_VERSION: JSON.stringify(gitRevisionPlugin.version()),
        GIT_COMMIT_HASH: JSON.stringify(gitRevisionPlugin.commithash()),
        GIT_BRANCH: JSON.stringify(gitRevisionPlugin.branch()),
        GIT_LAST_COMMIT_DATETIME: JSON.stringify(
          gitRevisionPlugin.lastcommitdatetime(),
        ),
      }),
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
    ],
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      fallback: {
        crypto: require.resolve('crypto-browserify'),
        buffer: require.resolve('buffer/'),
        stream: require.resolve('stream-browserify'),
        events: require.resolve('events/'),
        vm: require.resolve('vm-browserify'),
      },
      alias: {
        process: 'process/browser',
      },
    },
    output: {
      filename: isProd ? 'bundle.[contenthash].js' : 'bundle.js', // cache busting in prod
      path: path.resolve(__dirname, 'dist'),
      clean: true,
    },
    // @ts-expect-error "devServer" does not exist in type "Configuration", but it works
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      client: {
        overlay: {
          runtimeErrors: false,
        },
      },
      compress: true,
      allowedHosts: 'all',
      port: 4200,
    },
    // enable external sourcemaps in prod, for debugging
    devtool: isProd ? 'source-map' : 'eval-source-map',
  };
};