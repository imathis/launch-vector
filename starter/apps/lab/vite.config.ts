import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

import { labPlugin } from "@launch-vector/lab/vite"

const port = process.env.PORT ? Number(process.env.PORT) : undefined

export default defineConfig({
  plugins: [react(), tailwindcss(), labPlugin()],
  // A linked Lab checkout would otherwise load its own React.
  resolve: { dedupe: ["react", "react-dom"] },
  server: {
    host: process.env.HOST,
    port,
    strictPort: port !== undefined,
  },
})
