import { useEffect, useState } from "react"

const highlightedSources = new Map<string, Promise<string>>()

function highlight(source: string) {
  const cached = highlightedSources.get(source)
  if (cached) return cached

  const highlighted = import("./highlight").then(({ highlightCode }) =>
    highlightCode(source)
  )
  highlightedSources.set(source, highlighted)
  return highlighted
}

export function SourceCode({ source }: { source: string }) {
  const [html, setHtml] = useState<string>()

  useEffect(() => {
    let active = true

    void highlight(source)
      .then((highlighted) => {
        if (active) setHtml(highlighted)
      })
      .catch(() => highlightedSources.delete(source))

    return () => {
      active = false
    }
  }, [source])

  if (!html) {
    return (
      <pre className="source-code-fallback">
        <code>{source}</code>
      </pre>
    )
  }

  return (
    <div className="source-code" dangerouslySetInnerHTML={{ __html: html }} />
  )
}
