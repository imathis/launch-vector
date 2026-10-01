/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from "react"

import type { ExperimentEntry } from "./experiment-registry"
import type { LabConfig } from "./lab-config"

export type LabHost = {
  title: string
  config: LabConfig
  experiments: readonly ExperimentEntry[]
}

const LabHostContext = createContext<LabHost | null>(null)

export function LabHostProvider({
  value,
  children,
}: {
  value: LabHost
  children: ReactNode
}) {
  return (
    <LabHostContext.Provider value={value}>{children}</LabHostContext.Provider>
  )
}

export function useLabHost() {
  const host = useContext(LabHostContext)
  if (!host) throw new Error("LabHostProvider is required")
  return host
}
