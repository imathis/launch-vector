import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"

import { defineComponentDoc } from "../docs/types"

const source = `import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"

<NativeSelect className="w-full [&>select]:min-h-11" defaultValue="number">
  <NativeSelectOption value="boolean">True or false</NativeSelectOption>
  <NativeSelectOption value="number">Number</NativeSelectOption>
  <NativeSelectOption value="text">Text</NativeSelectOption>
</NativeSelect>`

export default defineComponentDoc({
  slug: "native-select",
  title: "Native Select",
  purpose:
    "Presents a compact list of mutually exclusive choices using the browser’s native select control.",
  guidance: {
    useWhen:
      "The option labels are short and native mobile selection behavior is preferable to a custom popover.",
    avoidWhen:
      "Options need rich content, search, multiple selection, or visible comparison. Use Select, Combobox, or an option group instead.",
  },
  examples: [
    {
      title: "Answer type",
      description:
        "A full-width native control provides efficient keyboard and mobile selection for a short option list.",
      source,
      preview: (
        <NativeSelect
          className="w-full max-w-sm [&>select]:min-h-11"
          defaultValue="number"
        >
          <NativeSelectOption value="boolean">True or false</NativeSelectOption>
          <NativeSelectOption value="number">Number</NativeSelectOption>
          <NativeSelectOption value="text">Text</NativeSelectOption>
        </NativeSelect>
      ),
    },
  ],
  variantsAndStates:
    "Use the default size for forms and the small size only in dense desktop interfaces. Native disabled and aria-invalid states control interaction and validation styling.",
  mobile:
    "Native selects use platform pickers on mobile. Keep the control at least 44px high, provide enough width for the longest likely label, and avoid placing it beside other narrow controls.",
  accessibility:
    "Associate the select with a visible FieldLabel. Keep option text unique and concise, use optgroups for meaningful categories, and set aria-invalid with connected error text when validation fails.",
})
