import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // Laravel sirve el build de producción desde public/app/ (mismo origen
  // que la API, sin CORS) — en desarrollo sigue sirviendo en la raíz.
  base: command === 'build' ? '/app/' : '/',
}))
