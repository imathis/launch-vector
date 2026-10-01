import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "./App"
import type { ExperimentEntry } from "./experiment-registry"
import { LabHostProvider } from "./host-context"
import type { LabConfig } from "./lab-config"
import { ThemeProvider } from "./theme/theme-provider"
import "./styles/harness.css"

export type MountLabOptions = {
  root: HTMLElement
  config: LabConfig
  experiments: readonly ExperimentEntry[]
  title?: string
}

export function mountLab({
  root,
  config,
  experiments,
  title = "Lab",
}: MountLabOptions) {
  const reactRoot = createRoot(root)
  reactRoot.render(
    <StrictMode>
      <ThemeProvider>
        <LabHostProvider value={{ title, config, experiments }}>
          <App />
        </LabHostProvider>
      </ThemeProvider>
    </StrictMode>
  )
  return () => reactRoot.unmount()
}
