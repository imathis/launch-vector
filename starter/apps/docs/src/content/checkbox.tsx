import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"

import { defineComponentDoc } from "../docs/types"

const source = `import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"

<FieldGroup>
  <Field>
    <FieldLabel>Select students</FieldLabel>
    <Field orientation="horizontal">
      <Checkbox id="student-ada" />
      <FieldLabel htmlFor="student-ada">Ada · Foundations</FieldLabel>
    </Field>
    <Field orientation="horizontal">
      <Checkbox id="student-grace" defaultChecked />
      <FieldLabel htmlFor="student-grace">Grace · Essentials</FieldLabel>
    </Field>
    <FieldDescription>Choose every student this parent manages.</FieldDescription>
  </Field>
</FieldGroup>`

export default defineComponentDoc({
  slug: "checkbox",
  title: "Checkbox",
  purpose: "Adds or removes one independent choice from a set.",
  guidance: {
    useWhen:
      "Users may choose any number of items, including none, or must explicitly acknowledge one condition.",
    avoidWhen:
      "Exactly one choice is required, a setting takes effect immediately, or the action is a primary command. Use a radio group, switch, or button instead.",
  },
  examples: [
    {
      title: "Student selection",
      description:
        "Each checkbox has a class-qualified label, and the enclosing field explains the effect of selecting several students.",
      source,
      preview: (
        <div className="w-full max-w-sm">
          <FieldGroup>
            <Field>
              <FieldLabel>Select students</FieldLabel>
              <Field orientation="horizontal">
                <Checkbox id="docs-student-ada" />
                <FieldLabel htmlFor="docs-student-ada">
                  Ada · Foundations
                </FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <Checkbox id="docs-student-grace" defaultChecked />
                <FieldLabel htmlFor="docs-student-grace">
                  Grace · Essentials
                </FieldLabel>
              </Field>
              <FieldDescription>
                Choose every student this parent manages.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </div>
      ),
    },
  ],
  variantsAndStates:
    "Support checked, unchecked, disabled, required, invalid, and indeterminate states. Use indeterminate only for a parent control representing a partially selected group.",
  mobile:
    "Place each checkbox inside a full-width label row with at least 44px of height. Let long labels wrap and keep enough separation between adjacent options to prevent accidental taps.",
  accessibility:
    "Every checkbox needs a visible associated label. Group related checkboxes under a FieldSet and FieldLegend when the group label is necessary. Keyboard users toggle the focused checkbox with Space.",
})
