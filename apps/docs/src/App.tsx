import { startTransition, useEffect, useState, type MouseEvent } from "react"

import { ThemeToggle } from "@workspace/ui/theme/theme-toggle"

import { PreviewSource } from "./components/preview-source"
import {
  componentDocs,
  defaultComponentSlug,
  findComponentDoc,
} from "./docs/registry"

function readComponentSlug() {
  const requestedSlug = new URLSearchParams(window.location.search).get(
    "component"
  )
  return findComponentDoc(requestedSlug)?.slug ?? defaultComponentSlug
}

function componentHref(slug: string) {
  const params = new URLSearchParams(window.location.search)
  params.set("component", slug)
  return `${window.location.pathname}?${params.toString()}`
}

export function App() {
  const [selectedSlug, setSelectedSlug] = useState(readComponentSlug)
  const selectedDoc = findComponentDoc(selectedSlug) ?? componentDocs[0]

  useEffect(() => {
    const handlePopState = () => setSelectedSlug(readComponentSlug())
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    const requestedSlug = new URLSearchParams(window.location.search).get(
      "component"
    )
    if (requestedSlug !== selectedSlug) {
      window.history.replaceState(null, "", componentHref(selectedSlug))
    }
  }, [selectedSlug])

  const selectComponent = (
    event: MouseEvent<HTMLAnchorElement>,
    slug: string
  ) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    event.preventDefault()
    window.history.pushState(null, "", componentHref(slug))
    startTransition(() => setSelectedSlug(slug))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (!selectedDoc) {
    return <p className="p-6">No component documentation found.</p>
  }

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a
            className="min-h-11 content-center font-semibold tracking-tight"
            href="#top"
          >
            Vector docs
          </a>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[12rem_minmax(0,1fr)] md:py-14">
        <nav
          aria-label="Documentation"
          className="md:sticky md:top-24 md:self-start"
        >
          <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Components
          </p>
          <div className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            {componentDocs.map((doc) => (
              <a
                key={doc.slug}
                className={`flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium ${doc.slug === selectedDoc.slug ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                href={componentHref(doc.slug)}
                aria-current={
                  doc.slug === selectedDoc.slug ? "page" : undefined
                }
                onClick={(event) => selectComponent(event, doc.slug)}
              >
                {doc.title}
              </a>
            ))}
          </div>
        </nav>

        <main id="top" className="min-w-0">
          <article className="space-y-12">
            <header className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                Component
              </p>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                {selectedDoc.title}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                {selectedDoc.purpose}
              </p>
            </header>

            <section
              aria-label="Usage guidance"
              className="grid gap-6 sm:grid-cols-2"
            >
              <div className="rounded-xl border border-border p-5">
                <h2 className="mb-3 text-lg font-semibold">Use when</h2>
                <div className="leading-7 text-muted-foreground">
                  {selectedDoc.guidance.useWhen}
                </div>
              </div>
              <div className="rounded-xl border border-border p-5">
                <h2 className="mb-3 text-lg font-semibold">Do not use when</h2>
                <div className="leading-7 text-muted-foreground">
                  {selectedDoc.guidance.avoidWhen}
                </div>
              </div>
            </section>

            <section aria-labelledby="examples" className="space-y-8">
              <h2
                id="examples"
                className="text-2xl font-semibold tracking-tight"
              >
                Examples
              </h2>
              {selectedDoc.examples.map((example) => (
                <div key={example.title} className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{example.title}</h3>
                    <p className="mt-2 leading-7 text-muted-foreground">
                      {example.description}
                    </p>
                  </div>
                  <PreviewSource
                    label={`${selectedDoc.title}: ${example.title}`}
                    source={example.source}
                  >
                    {example.preview}
                  </PreviewSource>
                </div>
              ))}
            </section>

            <section aria-labelledby="states" className="space-y-3">
              <h2 id="states" className="text-2xl font-semibold tracking-tight">
                Variants and states
              </h2>
              <div className="max-w-3xl leading-7 text-muted-foreground">
                {selectedDoc.variantsAndStates}
              </div>
            </section>

            <section aria-labelledby="mobile" className="space-y-3">
              <h2 id="mobile" className="text-2xl font-semibold tracking-tight">
                Mobile guidance
              </h2>
              <div className="max-w-3xl leading-7 text-muted-foreground">
                {selectedDoc.mobile}
              </div>
            </section>

            <section aria-labelledby="accessibility" className="space-y-3">
              <h2
                id="accessibility"
                className="text-2xl font-semibold tracking-tight"
              >
                Accessibility
              </h2>
              <div className="max-w-3xl leading-7 text-muted-foreground">
                {selectedDoc.accessibility}
              </div>
            </section>
          </article>
        </main>
      </div>
    </div>
  )
}
