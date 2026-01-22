import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
import { fileURLToPath } from "url"

// We need these lines to make __dirname work in modern Vite projects
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      // This maps the "@" symbol to your "src" folder
      "@": path.resolve(__dirname, "./src"),
    },
  },
})