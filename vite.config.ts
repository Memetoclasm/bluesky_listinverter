import { defineConfig } from 'vite'

export default defineConfig({
  base: '/bsky-list-converter/',
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
