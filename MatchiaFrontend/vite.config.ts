import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const srcDir = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'lvh-logger',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          setTimeout(() => {
            console.log('  ➜  Domain:  http://lvh.me:5173/')
          }, 100)
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(srcDir),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  server: {
    host: true,
    allowedHosts: [
      'lvh.me',
      '.lvh.me'
    ]
  }
})
