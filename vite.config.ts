import { defineConfig } from 'vite'

export default defineConfig({
  base: '/bsky-list-converter/',
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
