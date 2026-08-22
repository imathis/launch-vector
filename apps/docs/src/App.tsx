import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react"

import { ThemeToggle } from "@workspace/ui/theme/theme-toggle"
import { useTheme } from "@workspace/ui/theme/theme-provider"

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
  const { resolvedTheme } = useTheme()
  const [selectedSlug, setSelectedSlug] = useState(readComponentSlug)
  const selectedDoc = findComponentDoc(selectedSlug) ?? componentDocs[0]
  const mobileNavigation = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const handlePopState = () => setSelectedSlug(readComponentSlug())
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    )
    if (themeColor) {
      themeColor.content = resolvedTheme === "dark" ? "#1c1c1c" : "#ffffff"
    }
  }, [resolvedTheme])

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
    mobileNavigation.current?.removeAttribute("open")
    window.scrollTo({ top: 0, behavior: "instant" })
  }

  if (!selectedDoc) {
    return <p className="p-6">No component documentation found.</p>
  }

  return (
    <div className="docs-shell min-h-svh overflow-x-hidden">
      <a
        className="fixed top-2 left-2 z-50 -translate-y-20 rounded-md bg-background px-4 py-3 font-medium shadow-md focus-visible:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        href="#content"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a
            className="flex min-h-11 items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            href="/"
          >
            <span
              className="grid size-7 place-items-center rounded-md bg-foreground text-xs font-bold text-background"
              aria-hidden="true"
            >
              V
            </span>
            <span className="hidden min-[24rem]:inline">Vector Docs</span>
            <span className="min-[24rem]:hidden">Docs</span>
          </a>
          <ThemeToggle />
        </div>
      </header>

      <details
        ref={mobileNavigation}
        className="docs-mobile-navigation group sticky z-20 border-b border-border bg-background lg:hidden"
      >
        <summary className="mx-auto flex min-h-14 max-w-7xl cursor-pointer list-none items-center justify-between gap-4 px-4 text-sm font-medium marker:content-none hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-6 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="text-muted-foreground">Component:</span>{" "}
            {selectedDoc.title}
          </span>
          <span
            className="text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          >
            ↓
          </span>
        </summary>
        <nav
          aria-label="Mobile documentation"
          className="docs-mobile-menu mx-auto max-w-7xl overflow-y-auto border-t border-border px-4 py-3 sm:px-6"
        >
          <div className="grid gap-1">
            {componentDocs.map((doc) => (
              <a
                key={doc.slug}
                className={`flex min-h-11 items-center border-l-2 px-3 text-sm font-medium transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${doc.slug === selectedDoc.slug ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}
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
      </details>

      <div className="mx-auto grid max-w-7xl lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="docs-sidebar sticky hidden border-r border-border lg:block">
          <nav
            aria-label="Documentation"
            className="h-full overflow-y-auto px-5 py-8"
          >
            <p className="mb-3 px-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Components
            </p>
            <div className="grid gap-1">
              {componentDocs.map((doc) => (
                <a
                  key={doc.slug}
                  className={`flex min-h-11 items-center border-l-2 px-3 text-sm font-medium transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${doc.slug === selectedDoc.slug ? "border-foreground bg-muted/60 text-foreground" : "border-transparent text-muted-foreground"}`}
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
        </aside>

        <main
          id="content"
          className="min-w-0 scroll-mt-36 px-4 py-10 sm:px-8 sm:py-12 lg:scroll-mt-20 lg:px-12 lg:py-16 xl:px-16"
        >
          <article className="max-w-4xl space-y-14">
            <header className="space-y-5 border-b border-border pb-10">
              <p className="text-sm font-medium text-muted-foreground">
                Components <span aria-hidden="true">/</span>{" "}
                <span className="text-foreground">{selectedDoc.title}</span>
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-pretty sm:text-5xl">
                {selectedDoc.title}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-pretty text-muted-foreground">
                {selectedDoc.purpose}
              </p>
            </header>

            <section
              aria-label="Usage guidance"
              className="grid overflow-hidden rounded-xl border border-border bg-muted/25 sm:grid-cols-2"
            >
              <div className="p-5 sm:p-6">
                <h2 className="mb-3 text-lg font-semibold">Use When</h2>
                <div className="leading-7 text-muted-foreground">
                  {selectedDoc.guidance.useWhen}
                </div>
              </div>
              <div className="border-t border-border p-5 sm:border-t-0 sm:border-l sm:p-6">
                <h2 className="mb-3 text-lg font-semibold">Do Not Use When</h2>
                <div className="leading-7 text-muted-foreground">
                  {selectedDoc.guidance.avoidWhen}
                </div>
              </div>
            </section>

            <section aria-labelledby="examples" className="space-y-8">
              <h2
                id="examples"
                className="scroll-mt-36 text-2xl font-semibold tracking-tight lg:scroll-mt-24"
              >
                Examples
              </h2>
              {selectedDoc.examples.map((example) => (
                <div key={example.title} className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-pretty">
                      {example.title}
                    </h3>
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
              <h2
                id="states"
                className="scroll-mt-36 text-2xl font-semibold tracking-tight lg:scroll-mt-24"
              >
                Variants & States
              </h2>
              <div className="max-w-3xl leading-7 text-muted-foreground">
                {selectedDoc.variantsAndStates}
              </div>
            </section>

            <section aria-labelledby="mobile" className="space-y-3">
              <h2
                id="mobile"
                className="scroll-mt-36 text-2xl font-semibold tracking-tight lg:scroll-mt-24"
              >
                Mobile Guidance
              </h2>
              <div className="max-w-3xl leading-7 text-muted-foreground">
                {selectedDoc.mobile}
              </div>
            </section>

            <section aria-labelledby="accessibility" className="space-y-3">
              <h2
                id="accessibility"
                className="scroll-mt-36 text-2xl font-semibold tracking-tight lg:scroll-mt-24"
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
