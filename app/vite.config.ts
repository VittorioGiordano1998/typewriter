import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // three.js is large by nature; the scene is lazy-loaded so the warning is noise.
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
