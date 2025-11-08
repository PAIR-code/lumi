/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { Options } from '@swc/core';
import type { StorybookConfig } from '@storybook/web-components-webpack5';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-webpack5-compiler-swc',
    '@storybook/addon-essentials',
    '@storybook/addon-styling-webpack',
    '@storybook/preset-scss',
    {
      name: '@storybook/addon-styling-webpack',

      options: {
        rules: [
          {
            test: /\.css$/,
            sideEffects: true,
            use: [
              require.resolve('style-loader'),
              {
                loader: require.resolve('css-loader'),
                options: {},
              },
            ],
          },
          {
            test: /_storybook_global_styles\.s[ac]ss$/i,
            use: [
              require.resolve('style-loader'),
              {
                loader: require.resolve('css-loader'),
                options: {
                  importLoaders: 1, // For sass-loader
                },
              },
              {
                loader: require.resolve('sass-loader'),
                options: {
                  implementation: require('sass'),
                },
              },
            ],
          },
          {
            test: /\.s[ac]ss$/i, // Handles .scss and .sass
            exclude: /_storybook_global_styles\.s[ac]ss$/i, // Ignore global styles file
            sideEffects: true,
            use: [
              {
                loader: './lit-css-loader.js',
              },
              {
                loader: require.resolve('sass-loader'),
                options: {
                  implementation: require('sass'),
                },
              },
            ],
          },
        ],
      },
    },
  ],
  framework: {
    name: '@storybook/web-components-webpack5',
    options: {},
  },
  staticDirs: ['../../local_image_bucket', 'test_images'],
  swc: (config: Options, options): Options => {
    const newConfig = {
      ...config,
      jsc: {
        ...config.jsc,
        parser: {
          ...config.jsc?.parser,
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          ...config.jsc?.transform,
          legacyDecorator: true,
          decoratorMetadata: true,
          useDefineForClassFields: false,
        },
      },
    };

    return newConfig;
  },
};
export default config;
