import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Redirige les appels /api vers le serveur backend (localhost:5000 par défaut)
    proxy: {
      '/api': process.env.API_URL || 'http://localhost:5000'
    }
  }
})
