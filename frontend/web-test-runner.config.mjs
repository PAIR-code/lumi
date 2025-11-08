import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

import { scssPlugin } from './wtr-scss-plugin.mjs';

export default {
  browsers: [playwrightLauncher({ product: 'chromium' })],
  files: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  plugins: [
    scssPlugin(),
    esbuildPlugin({
      ts: true,
      tsconfig: './tsconfig.json',
    }),
  ],
  nodeResolve: true,
  testRunnerHtml: (testFile) => `
    <!DOCTYPE html>
    <html>
      <body>
        <script>
          // Polyfill process.env.NODE_ENV before any tests run
          window.process = { env: { NODE_ENV: 'development' } };
        </script>
        <script type="module" src="${testFile}"></script>
      </body>
    </html>
  `,
};
