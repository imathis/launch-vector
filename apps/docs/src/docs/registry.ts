import type { ComponentDocModule } from "./types"

const modules = import.meta.glob<ComponentDocModule>(
  ["../content/*.tsx", "!../content/_template.tsx"],
  { eager: true }
)

export const componentDocs = Object.values(modules)
  .map((module) => module.default)
  .sort((a, b) => a.title.localeCompare(b.title))

export const defaultComponentSlug = componentDocs[0]?.slug ?? ""

export function findComponentDoc(slug: string | null) {
  return componentDocs.find((doc) => doc.slug === slug)
}
