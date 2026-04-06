import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      include: ['util', 'process', 'path', 'fs', 'url', 'http', 'https', 'buffer'],
      globals: {
        process: true,
        global: true,
        Buffer: true,
      },
    }),
  ],
})
