import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: process.env.BASE_PATH || '/speedstorm-calculator/',
  test: { include: ['src/**/*.test.ts'] },
});
