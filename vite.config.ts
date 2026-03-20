import { defineConfig } from 'vite'

export default defineConfig({
  base: '/bluesky_listinverter/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'atproto': ['@atproto/api', '@atproto/oauth-client-browser']
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
