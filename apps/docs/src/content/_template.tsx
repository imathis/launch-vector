import { defineComponentDoc } from "../docs/types"

// Copy to <slug>.tsx, replace every placeholder, and import the real component
// directly from @workspace/ui. The registry intentionally excludes this file.
export default defineComponentDoc({
  slug: "component-name",
  title: "Component name",
  purpose: "State the single job this component performs.",
  guidance: {
    useWhen: "Describe the interaction or content this component suits.",
    avoidWhen: "Name the better semantic alternative and when to use it.",
  },
  examples: [
    {
      title: "Representative variants and states",
      description: "Explain what the example demonstrates.",
      source: `import { ComponentName } from "@workspace/ui/components/component-name"

<ComponentName />`,
      preview: (
        <div className="flex min-h-11 items-center rounded-lg border border-border bg-background px-4 text-foreground">
          Replace with the real component preview.
        </div>
      ),
    },
  ],
  variantsAndStates:
    "Document meaningful variants, disabled/loading/open/error states, and the behavior that chooses each one.",
  mobile:
    "Document narrow layouts, wrapping or overflow, safe-area behavior, and 44px minimum touch targets.",
  accessibility:
    "Document naming, keyboard behavior, focus management, state announcements, and required structure.",
})
