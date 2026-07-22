import { defineConfig } from 'vite';

export default defineConfig({
  base: '/EventVS-Portal/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
