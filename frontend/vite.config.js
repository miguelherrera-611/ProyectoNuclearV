import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // En producción, Laravel sirve este build desde public/app/ (mismo origen
  // que la API, sin CORS) — por eso los assets construidos deben referirse a
  // sí mismos bajo /app/. En desarrollo (`npm run dev`) seguimos sirviendo
  // en la raíz, como siempre, para no romper el flujo local de ahora.
  base: command === 'build' ? '/app/' : '/',
}))
