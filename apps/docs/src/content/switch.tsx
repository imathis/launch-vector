import { Switch } from "@workspace/ui/components/switch"

import { defineComponentDoc } from "../docs/types"

const labeledSource = `import { Switch } from "@workspace/ui/components/switch"

<label className="flex min-h-11 w-full max-w-md cursor-pointer items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
  <span>
    <span className="block font-medium">Notifications</span>
    <span className="block text-sm text-muted-foreground">
      Receive updates when something needs your attention.
    </span>
  </span>
  <Switch defaultChecked />
</label>`

const statesSource = `<div className="w-full max-w-sm space-y-3">
  <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
    <span>Available setting</span>
    <Switch />
  </label>
  <label className="flex min-h-11 items-center justify-between gap-4 text-muted-foreground">
    <span>Unavailable setting</span>
    <Switch disabled />
  </label>
  <p className="text-sm text-muted-foreground">
    Unavailable while parental controls are enabled.
  </p>
</div>`

export default defineComponentDoc({
  slug: "switch",
  title: "Switch",
  purpose: "Turns a setting on or off and applies the change immediately.",
  guidance: {
    useWhen:
      "A setting has two opposing states and changing it takes effect immediately.",
    avoidWhen:
      "The user must choose one item from a list, confirm changes with a separate submit action, or answer a yes-or-no question. Use a radio group, checkbox, or buttons instead.",
  },
  examples: [
    {
      title: "Labeled setting",
      description:
        "Wrap the switch and its copy in one label to create a generous touch target and a clear accessible name.",
      source: labeledSource,
      preview: (
        <label className="flex min-h-11 w-full max-w-md cursor-pointer items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
          <span>
            <span className="block font-medium">Notifications</span>
            <span className="block text-sm text-muted-foreground">
              Receive updates when something needs your attention.
            </span>
          </span>
          <Switch defaultChecked />
        </label>
      ),
    },
    {
      title: "Available and disabled",
      description:
        "A disabled switch communicates current state but needs nearby text explaining why the setting cannot change.",
      source: statesSource,
      preview: (
        <div className="w-full max-w-sm space-y-3">
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
            <span>Available setting</span>
            <Switch />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-4 text-muted-foreground">
            <span>Unavailable setting</span>
            <Switch disabled />
          </label>
          <p className="text-sm text-muted-foreground">
            Unavailable while parental controls are enabled.
          </p>
        </div>
      ),
    },
  ],
  variantsAndStates:
    "Use the default size for touch interfaces. The small visual size can work in dense desktop layouts only when its surrounding label still provides a 44px interaction target. Support checked, unchecked, disabled, read-only, required, and invalid states according to the setting’s behavior.",
  mobile:
    "Make the entire row tappable, keep at least 44px of height, place the label before the control, and leave enough room for translated or large text to wrap. Do not rely on the small switch track as the only touch target.",
  accessibility:
    "Every switch needs an accessible name. A wrapping label is the simplest Base UI pattern and also enlarges the hit area. Keyboard users toggle it with Space. Use checked state for the value, disabled only when interaction is impossible, and nearby text for restrictions or errors.",
})
