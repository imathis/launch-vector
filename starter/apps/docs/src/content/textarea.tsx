import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Textarea } from "@workspace/ui/components/textarea"

import { defineComponentDoc } from "../docs/types"

const source = `import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Textarea } from "@workspace/ui/components/textarea"

<Field>
  <FieldLabel htmlFor="weekly-highlight">Weekly highlight</FieldLabel>
  <Textarea
    id="weekly-highlight"
    placeholder="Share a highlight or challenge from this week."
    rows={5}
  />
  <FieldDescription>Include enough context for the tutor to respond.</FieldDescription>
</Field>`

export default defineComponentDoc({
  slug: "textarea",
  title: "Textarea",
  purpose: "Collects a multi-line freeform response.",
  guidance: {
    useWhen:
      "The expected answer may need several sentences, line breaks, or more room than a single-line input provides.",
    avoidWhen:
      "The response is short and structured, or users should choose from known options. Use Input, Checkbox, or Native Select instead.",
  },
  examples: [
    {
      title: "Long-form response",
      description:
        "A visible label and concise guidance frame an open-ended weekly report answer.",
      source,
      preview: (
        <Field className="w-full max-w-lg">
          <FieldLabel htmlFor="docs-weekly-highlight">
            Weekly highlight
          </FieldLabel>
          <Textarea
            id="docs-weekly-highlight"
            placeholder="Share a highlight or challenge from this week."
            rows={5}
          />
          <FieldDescription>
            Include enough context for the tutor to respond.
          </FieldDescription>
        </Field>
      ),
    },
  ],
  variantsAndStates:
    "Support empty, filled, disabled, readonly, required, and aria-invalid states. Connect validation feedback through the surrounding Field.",
  mobile:
    "Use the full available width, allow vertical growth, and avoid placing controls beside the textarea. Keep nearby actions at least 44px high and above the bottom safe area.",
  accessibility:
    "Associate a visible FieldLabel through matching htmlFor and id values. Connect descriptions and errors, preserve keyboard focus styling, and do not rely on placeholder text as the label.",
})
