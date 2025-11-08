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

import { GitRevisionPlugin } from 'git-revision-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import * as path from 'path';
import * as webpack from 'webpack';

// Helper function to safely call git plugin methods with fallbacks
function safeGitCall<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// Helper function to safely get git revision info with fallbacks
function getGitInfo() {
  try {
    const gitRevisionPlugin = new GitRevisionPlugin({ branch: true });
    return {
      version: safeGitCall(() => gitRevisionPlugin.version(), 'unknown'),
      commithash: safeGitCall(() => gitRevisionPlugin.commithash(), 'unknown'),
      branch: safeGitCall(() => gitRevisionPlugin.branch(), 'unknown'),
      lastcommitdatetime: safeGitCall(
        () => gitRevisionPlugin.lastcommitdatetime(),
        'unknown'
      ),
    };
  } catch (error) {
    // Git not available or not a git repository (e.g., in Docker with mounted volumes)
    console.warn(
      'Git not available or not a git repository, using fallback values for git revision info'
    );
    return {
      version: 'unknown',
      commithash: 'unknown',
      branch: 'unknown',
      lastcommitdatetime: 'unknown',
    };
  }
}

const gitInfo = getGitInfo();

const config: webpack.Configuration = {
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
      GIT_VERSION: JSON.stringify(gitInfo.version),
      GIT_COMMIT_HASH: JSON.stringify(gitInfo.commithash),
      GIT_BRANCH: JSON.stringify(gitInfo.branch),
      GIT_LAST_COMMIT_DATETIME: JSON.stringify(gitInfo.lastcommitdatetime),
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
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
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
    port: 4201,
  },
};

export default config;
