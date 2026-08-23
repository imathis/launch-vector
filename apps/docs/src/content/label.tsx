import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { defineComponentDoc } from "../docs/types"

const source = `import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

<div className="grid gap-2">
  <Label htmlFor="project-name">Project name</Label>
  <Input id="project-name" />
</div>`

export default defineComponentDoc({
  slug: "label",
  title: "Label",
  purpose: "Gives a form control a visible and programmatic name.",
  guidance: {
    useWhen:
      "A form control needs a concise name that remains visible before, during, and after entry.",
    avoidWhen:
      "The text explains format, consequences, or errors rather than naming the control. Use nearby help or validation text and associate it separately.",
  },
  examples: [
    {
      title: "Input label",
      description:
        "Match htmlFor to the control id so clicking the label focuses the field.",
      source,
      preview: (
        <div className="grid w-full max-w-sm gap-2">
          <Label htmlFor="docs-project-name">Project name</Label>
          <Input id="docs-project-name" className="min-h-11" />
        </div>
      ),
    },
  ],
  variantsAndStates:
    "Labels inherit disabled styling from their field group. Keep required and optional indicators consistent across the form rather than decorating individual labels arbitrarily.",
  mobile:
    "Keep labels close to their controls, let long or translated text wrap, and include the label within the touch target for compact binary controls when appropriate.",
  accessibility:
    "Use htmlFor and a unique control id, or wrap the native control directly. Do not use placeholders as labels. Keep the visible label aligned with the accessible name users encounter with assistive technology.",
})
