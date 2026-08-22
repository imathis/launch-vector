import type { ReactNode } from "react"

export type ComponentExample = {
  title: string
  description: string
  preview: ReactNode
  source: string
}

export type ComponentDoc = {
  slug: string
  title: string
  purpose: string
  guidance: {
    useWhen: ReactNode
    avoidWhen: ReactNode
  }
  examples: readonly ComponentExample[]
  variantsAndStates: ReactNode
  mobile: ReactNode
  accessibility: ReactNode
}

export type ComponentDocModule = {
  default: ComponentDoc
}

export function defineComponentDoc<const Doc extends ComponentDoc>(doc: Doc) {
  return doc
}
