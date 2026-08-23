import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"

import { defineComponentDoc } from "../docs/types"

const source = `import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"

<Dialog>
  <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create automation</DialogTitle>
      <DialogDescription>Configure when the notification should run.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
      <Button>Create</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`

export default defineComponentDoc({
  slug: "dialog",
  title: "Dialog",
  purpose:
    "Focuses attention on a short task or decision without leaving the current page.",
  guidance: {
    useWhen:
      "The user must complete a bounded action, confirm a consequence, or provide a small amount of information in context.",
    avoidWhen:
      "The task is long, needs its own URL, benefits from browser navigation, or contains multiple conceptual steps. Use a page instead.",
  },
  examples: [
    {
      title: "Action dialog",
      description:
        "Use a descriptive title, concise supporting copy, and a primary action paired with an explicit way to cancel.",
      source,
      preview: (
        <Dialog>
          <DialogTrigger render={<Button className="min-h-11 px-4" />}>
            Open dialog
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create automation</DialogTitle>
              <DialogDescription>
                Configure when the notification should run.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ),
    },
  ],
  variantsAndStates:
    "Dialogs support controlled and uncontrolled open state. Keep one primary action, use outline or secondary styling for supporting actions, and reserve destructive styling for irreversible consequences.",
  mobile:
    "Keep content within the viewport, allow form content to scroll when necessary, stack actions on narrow layouts, and respect safe-area insets. Prefer a full page when the task cannot remain concise.",
  accessibility:
    "Always provide DialogTitle and usually DialogDescription. Focus moves into the dialog when it opens, remains trapped while modal, and returns to the trigger when it closes. Escape and the close control must dismiss non-blocking dialogs.",
})
