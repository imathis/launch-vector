/* eslint-disable react-refresh/only-export-components */
import { Button } from "@workspace/ui/components/button"

import { defineExperiment, type ExperimentRenderProps } from "../../experiment"

function Welcome({ variant, scenario }: ExperimentRenderProps) {
  const isStrong = variant === "strong"

  return (
    <section className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 text-card-foreground sm:p-10">
      <p className="text-sm font-medium text-muted-foreground">
        Committed fixture
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">
        {scenario === "returning" ? "Welcome back." : "Welcome to the lab."}
      </h2>
      <p className="mt-3 max-w-md leading-7 text-muted-foreground">
        This fixture proves discovery, variants, scenarios, and shared UI
        without becoming a product prototype.
      </p>
      <Button
        className="mt-6 min-h-11 px-4"
        variant={isStrong ? "default" : "outline"}
      >
        {isStrong ? "Start exploring" : "View guidance"}
      </Button>
    </section>
  )
}

export default defineExperiment({
  metadata: {
    title: "Welcome",
    description: "A committed fixture for exercising the lab harness.",
  },
  variants: {
    quiet: { label: "Quiet" },
    strong: { label: "Strong" },
  },
  scenarios: {
    firstVisit: { label: "First visit" },
    returning: { label: "Returning" },
  },
  render: Welcome,
})
