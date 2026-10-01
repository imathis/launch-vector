import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { defineComponentDoc } from "../docs/types"

const source = `import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

<FieldGroup>
  <Field>
    <FieldLabel htmlFor="profile-name">Name</FieldLabel>
    <Input id="profile-name" className="min-h-11" />
    <FieldDescription>Use the name other members will recognize.</FieldDescription>
  </Field>
  <Field data-invalid>
    <FieldLabel htmlFor="profile-email">Email</FieldLabel>
    <Input id="profile-email" type="email" className="min-h-11" aria-invalid />
    <FieldError>Enter a valid email address.</FieldError>
  </Field>
</FieldGroup>`

export default defineComponentDoc({
  slug: "field",
  title: "Field",
  purpose:
    "Composes a form control with its visible label, supporting description, and validation message.",
  guidance: {
    useWhen:
      "Building forms that need consistent label, help text, error, orientation, or related-field structure.",
    avoidWhen:
      "Displaying read-only label/value pairs or unrelated page content. Use semantic text or a data-list pattern instead.",
  },
  examples: [
    {
      title: "Description and validation",
      description:
        "FieldGroup establishes form rhythm while Field keeps each control associated with its guidance and error state.",
      source,
      preview: (
        <div className="w-full max-w-sm">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="docs-profile-name">Name</FieldLabel>
              <Input id="docs-profile-name" className="min-h-11" />
              <FieldDescription>
                Use the name other members will recognize.
              </FieldDescription>
            </Field>
            <Field data-invalid>
              <FieldLabel htmlFor="docs-profile-email">Email</FieldLabel>
              <Input
                id="docs-profile-email"
                type="email"
                className="min-h-11"
                aria-invalid
              />
              <FieldError>Enter a valid email address.</FieldError>
            </Field>
          </FieldGroup>
        </div>
      ),
    },
  ],
  variantsAndStates:
    "Use vertical fields by default. Horizontal and responsive orientations suit compact binary controls or wide settings layouts. Put data-invalid on Field and aria-invalid on its control; put data-disabled on Field and disabled on its control.",
  mobile:
    "Keep the default vertical orientation on narrow screens, let descriptions wrap, and keep controls at least 44px high. Use responsive orientation only when the container has enough room for both label content and control.",
  accessibility:
    "Use FieldLabel with a matching control id. FieldSet and FieldLegend group related choices. FieldError has alert semantics, but applications should also move focus or provide an error summary when submission fails.",
})
