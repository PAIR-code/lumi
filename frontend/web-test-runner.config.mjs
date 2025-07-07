import {litSsrPlugin} from '@lit-labs/testing/web-test-runner-ssr-plugin.js';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
   browsers: [
    playwrightLauncher({ product: 'chromium' }),
  ],
  files: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  plugins: [esbuildPlugin({ ts: true }), litSsrPlugin()],
};