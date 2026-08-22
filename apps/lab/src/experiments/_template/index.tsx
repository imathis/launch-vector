/* eslint-disable react-refresh/only-export-components */
import { Button } from "@workspace/ui/components/button"

import { defineExperiment, type ExperimentRenderProps } from "../../experiment"

function Prototype({ variant, scenario }: ExperimentRenderProps) {
  return (
    <div>
      <p>Replace with the smallest prototype needed to answer the brief.</p>
      <Button className="mt-4 min-h-11">
        {variant}: {scenario}
      </Button>
    </div>
  )
}

// Copy this directory, rename it, and keep variants/scenarios explicit.
// Prototypes are disposable; accepted work is reimplemented in its destination app.
export default defineExperiment({
  metadata: {
    title: "Prototype title",
    description: "Question this prototype explores.",
  },
  variants: { default: { label: "Default" } },
  scenarios: { default: { label: "Default" } },
  render: Prototype,
})
