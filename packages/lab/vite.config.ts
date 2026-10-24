import path from "node:path"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

import pkg from "./package.json" with { type: "json" }

// Workspaces install these. Bundling them duplicates React and leaves CJS
// `require("react")` calls that throw in the browser.
const installed = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
]

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "#": path.resolve(import.meta.dirname, "src"),
    },
  },
  build: {
    lib: {
      entry: {
        index: path.resolve(import.meta.dirname, "src/index.ts"),
        vite: path.resolve(import.meta.dirname, "src/vite.ts"),
      },
      formats: ["es"],
      cssFileName: "lab",
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      external: (id) =>
        id.startsWith("node:") ||
        installed.some((name) => id === name || id.startsWith(`${name}/`)),
    },
    sourcemap: true,
    emptyOutDir: true,
  },
})
