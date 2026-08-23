export type LabRoute =
  | { kind: "guide" }
  | { kind: "add" }
  | { kind: "experiment"; experiment: string }

export const labRoutes = {
  guide: () => "/",
  add: () => "/new",
  experiment: (experiment: string) => `/labs/${encodeURIComponent(experiment)}`,
}

export function parseLabRoute(pathname: string): LabRoute {
  const normalized = pathname.replace(/\/+$/, "") || "/"
  if (normalized === "/") return { kind: "guide" }
  if (normalized === "/new") return { kind: "add" }

  const match = /^\/labs\/([^/]+)$/.exec(normalized)
  if (match?.[1]) {
    try {
      return {
        kind: "experiment",
        experiment: decodeURIComponent(match[1]),
      }
    } catch {
      return { kind: "guide" }
    }
  }

  return { kind: "guide" }
}
