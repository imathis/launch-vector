import { Button } from "@workspace/ui/components/button"

import { defineComponentDoc } from "../docs/types"

const source = `import { Button } from "@workspace/ui/components/button"

<Button className="min-h-11 px-4">Continue</Button>
<Button className="min-h-11 px-4" variant="secondary">Save draft</Button>
<Button className="min-h-11 px-4" variant="outline">Cancel</Button>
<Button className="min-h-11 px-4" variant="destructive">Delete</Button>
<Button className="min-h-11 px-4" disabled>Unavailable</Button>
<Button className="h-auto min-h-11 max-w-full px-4 py-2 text-center whitespace-normal">
  Continue with a deliberately long action label
</Button>`

export default defineComponentDoc({
  slug: "button",
  title: "Button",
  purpose: "Triggers an immediate action or advances a user through a task.",
  guidance: {
    useWhen:
      "The user can submit, confirm, create, delete, or otherwise act now.",
    avoidWhen:
      "The destination is another page. Use a link and preserve browser navigation.",
  },
  examples: [
    {
      title: "Variants and resilient labels",
      description:
        "Variants communicate hierarchy and consequence, not decoration.",
      source,
      preview: (
        <>
          <Button className="min-h-11 px-4">Continue</Button>
          <Button className="min-h-11 px-4" variant="secondary">
            Save draft
          </Button>
          <Button className="min-h-11 px-4" variant="outline">
            Cancel
          </Button>
          <Button className="min-h-11 px-4" variant="destructive">
            Delete
          </Button>
          <Button className="min-h-11 px-4" disabled>
            Unavailable
          </Button>
          <Button className="h-auto min-h-11 max-w-full px-4 py-2 text-center whitespace-normal">
            Continue with a deliberately long action label
          </Button>
        </>
      ),
    },
  ],
  variantsAndStates:
    "Use default for the primary action, secondary or outline for supporting actions, and destructive only for consequential actions. Hover, active, focus-visible, and disabled states are built in. Disabled controls must not be the only place that explains why an action is unavailable.",
  mobile:
    "Keep touch targets at least 44px high, leave space between competing actions, and let long labels wrap instead of shrinking text or overflowing the viewport. Place persistent actions above the safe-area inset.",
  accessibility:
    "Use a concise action label, preserve visible focus, and use the native disabled state when an action cannot run. Icon-only buttons need an accessible name. Announce asynchronous outcomes separately rather than changing the label without context.",
})
