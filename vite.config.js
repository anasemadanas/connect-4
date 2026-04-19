import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Needed for GitHub Pages when deployed under:
  // https://anasemadanas.github.io/connect-4/
  //base: '/connect-4/',
  base: '/anasemadanas/',
  plugins: [react()],
})
