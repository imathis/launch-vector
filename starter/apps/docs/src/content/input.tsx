import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { defineComponentDoc } from "../docs/types"

const source = `import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

<div className="grid gap-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="name@example.com" />
</div>`

export default defineComponentDoc({
  slug: "input",
  title: "Input",
  purpose: "Collects a short, single-line value from the user.",
  guidance: {
    useWhen:
      "The user needs to enter a name, email, number, search term, or another concise value.",
    avoidWhen:
      "The value spans multiple lines, comes from a constrained list, or is a binary choice. Use a textarea, select, radio group, checkbox, or switch.",
  },
  examples: [
    {
      title: "Labeled email input",
      description:
        "A visible label establishes meaning while the placeholder demonstrates format rather than replacing the label.",
      source,
      preview: (
        <div className="grid w-full max-w-sm gap-2">
          <Label htmlFor="docs-email">Email</Label>
          <Input
            id="docs-email"
            type="email"
            className="min-h-11"
            placeholder="name@example.com"
          />
        </div>
      ),
    },
  ],
  variantsAndStates:
    "Use native input types to provide the correct keyboard and validation behavior. Support empty, populated, disabled, read-only, required, invalid, and autofilled states without relying on placeholder text for meaning.",
  mobile:
    "Keep controls at least 44px high on touch layouts, choose the correct input type and inputMode, and leave enough width for entered values without shrinking text.",
  accessibility:
    "Associate every input with a visible Label. Connect help or error text with aria-describedby, use aria-invalid for validation failures, and preserve the user’s value when reporting errors.",
})
