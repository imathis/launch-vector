import { Button } from "@workspace/ui/components/button"
import { ThemeToggle } from "@workspace/ui/theme/theme-toggle"
import { useState } from "react"

export function App() {
  const [greetingVisible, setGreetingVisible] = useState(false)

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8">
      <header className="flex justify-end">
        <ThemeToggle />
      </header>
      <section className="flex flex-1 flex-col items-start justify-center gap-6 py-16">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Vector</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            A small, shared foundation.
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground">
            One component package, a focused documentation app, and a disposable
            prototype lab.
          </p>
        </div>
        <Button
          className="min-h-11 px-4"
          onClick={() => setGreetingVisible(true)}
        >
          Say hello
        </Button>
        <p className="min-h-7 text-lg font-medium" aria-live="polite">
          {greetingVisible ? "Hello, world!" : ""}
        </p>
      </section>
    </main>
  )
}
