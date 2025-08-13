import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30 seconds for API calls
    include: ['src/**/*.test.ts', 'src/**/test-*.ts'],
    env: {
      NODE_ENV: 'test'
    }
  },
});