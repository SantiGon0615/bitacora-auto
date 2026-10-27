import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Rutas relativas: funciona igual en localhost y en GitHub Pages (/bitacora-auto/)
  base: './',
  plugins: [react(), tailwindcss()],
})
