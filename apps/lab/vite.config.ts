import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

import { vectorLabManagementPlugin } from "./management/vite-plugin.js"

const port = process.env.PORT ? Number(process.env.PORT) : undefined

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), vectorLabManagementPlugin()],
  server: {
    host: process.env.HOST,
    port,
    strictPort: port !== undefined,
  },
})
