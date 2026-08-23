/* eslint-disable react-refresh/only-export-components */
import { Button } from "@workspace/ui/components/button"

import { defineExperiment, type ExperimentRenderProps } from "../../experiment"
import manifest from "./experiment.json"

function Prototype({ variant, scenario, view }: ExperimentRenderProps) {
  return (
    <div>
      <p>Replace with the smallest prototype needed to answer the brief.</p>
      <Button className="mt-4 min-h-11">
        {variant}: {scenario} ({view})
      </Button>
    </div>
  )
}

// Copy this directory, rename it, and keep variants/scenarios explicit.
// Prototypes are disposable; accepted work is reimplemented in its destination app.
export default defineExperiment({
  metadata: {
    title: manifest.title,
    description: manifest.description,
    notes: "Optional context that should stay out of the experiment canvas.",
  },
  variants: { default: { label: "Default" } },
  scenarios: { default: { label: "Default" } },
  render: Prototype,
})
