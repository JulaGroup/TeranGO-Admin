import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/auth': {
        target: 'https://monkfish-app-korrv.ondigitalocean.app',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'https://monkfish-app-korrv.ondigitalocean.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
