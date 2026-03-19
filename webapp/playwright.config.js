import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDictationsDir = path.join(__dirname, 'dictations-test');

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.js',
  globalTeardown: './tests/global-teardown.js',
  use: {
    baseURL: 'http://localhost:3001',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:3001',
    reuseExistingServer: false,
    env: {
      PORT: '3001',
      TEST_MODE: 'true',
      TTS_SERVICE: 'mock',
      CREATE_SECRET_TOKEN: 'test-token-123',
      DICTATIONS_DIR: testDictationsDir,
      // Dummy API keys so the Anthropic client doesn't throw on init
      CLAUDE_API_KEY: 'test-key',
      ELEVENLABS_API_KEY: 'test-key',
    },
  },
});
