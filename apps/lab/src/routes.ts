export type LabRoute =
  | { kind: "guide" }
  | { kind: "add" }
  | {
      kind: "experiment"
      experiment: string
      mode: "standard" | "presentation" | "frame"
    }

export const labRoutes = {
  guide: () => "/",
  add: () => "/new",
  experiment: (experiment: string) => `/labs/${encodeURIComponent(experiment)}`,
  presentation: (experiment: string) =>
    `/labs/${encodeURIComponent(experiment)}/present`,
  frame: (experiment: string) =>
    `/labs/${encodeURIComponent(experiment)}/frame`,
}

export function parseLabRoute(pathname: string): LabRoute {
  const normalized = pathname.replace(/\/+$/, "") || "/"
  if (normalized === "/") return { kind: "guide" }
  if (normalized === "/new") return { kind: "add" }

  const match = /^\/labs\/([^/]+)(?:\/(present|frame))?$/.exec(normalized)
  if (match?.[1]) {
    try {
      return {
        kind: "experiment",
        experiment: decodeURIComponent(match[1]),
        mode:
          match[2] === "present"
            ? "presentation"
            : match[2] === "frame"
              ? "frame"
              : "standard",
      }
    } catch {
      return { kind: "guide" }
    }
  }

  return { kind: "guide" }
}
