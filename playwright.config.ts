import { defineConfig } from '@playwright/test';

const PORT = 3110;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  // Single worker: all tests share one SQLite database via the web server.
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
  },
  webServer: {
    command: 'node server/index.js',
    url: `http://127.0.0.1:${PORT}/api/version`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      NODE_ENV: 'test',
      E2E_LISTEN: '1',
      PORT: String(PORT),
      JWT_SECRET: 'e2e-test-secret-0123456789abcdef0123456789abcdef',
      DB_PATH: 'server/e2e-data.db',
      LOG_LEVEL: 'warn',
      // The UI test loads the SPA from this origin; ES-module requests carry an
      // Origin header, so it must be in the CORS allow-list.
      ALLOWED_ORIGINS: `http://127.0.0.1:${PORT},http://localhost:${PORT}`,
    },
  },
});