import { Separator } from "@workspace/ui/components/separator"

import { defineComponentDoc } from "../docs/types"

const source = `import { Separator } from "@workspace/ui/components/separator"

<div className="flex flex-col gap-3">
  <p>Account settings</p>
  <Separator />
  <p className="text-sm text-muted-foreground">Profile and sign-in preferences</p>
</div>`

export default defineComponentDoc({
  slug: "separator",
  title: "Separator",
  purpose: "Visually distinguishes adjacent groups of related content.",
  guidance: {
    useWhen:
      "Two nearby content groups need a subtle visual boundary within the same section.",
    avoidWhen:
      "A heading, spacing, or separate surface already communicates the content hierarchy.",
  },
  examples: [
    {
      title: "Horizontal separator",
      description:
        "The separator reinforces an existing text hierarchy without becoming the only grouping cue.",
      source,
      preview: (
        <div className="flex w-full max-w-sm flex-col gap-3">
          <p>Account settings</p>
          <Separator />
          <p className="text-sm text-muted-foreground">
            Profile and sign-in preferences
          </p>
        </div>
      ),
    },
  ],
  variantsAndStates:
    "The default orientation is horizontal. Use vertical orientation only inside a row whose height is already established by its content.",
  mobile:
    "Separators do not require a touch target. Keep enough surrounding spacing that they do not make controls or text feel crowded, and avoid causing horizontal overflow.",
  accessibility:
    "Base UI exposes separator semantics and orientation. Do not use a separator as the sole indication of a named section; keep headings and document structure meaningful without it.",
})
