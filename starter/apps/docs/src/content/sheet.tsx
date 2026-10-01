import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"

import { defineComponentDoc } from "../docs/types"

const source = `import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"

<Sheet>
  <SheetTrigger render={<Button variant="outline" className="min-h-11" />}>
    Edit question
  </SheetTrigger>
  <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
    <SheetHeader>
      <SheetTitle>Edit question</SheetTitle>
      <SheetDescription>
        Update one focused part of the current page.
      </SheetDescription>
    </SheetHeader>
    <div className="flex-1 overflow-y-auto px-4">
      Sheet content stays focused and can scroll independently.
    </div>
    <SheetFooter className="border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
      <SheetClose render={<Button variant="outline" className="min-h-11" />}>
        Cancel
      </SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>`

export default defineComponentDoc({
  slug: "sheet",
  title: "Sheet",
  purpose:
    "Opens a focused complementary task from the edge while preserving the current page as context.",
  guidance: {
    useWhen:
      "The user needs to inspect or edit one bounded item without losing their place in the parent page.",
    avoidWhen:
      "The task is a brief confirmation or two-field setup; use Dialog. Use a dedicated page for long, multi-step work.",
  },
  examples: [
    {
      title: "Focused editor",
      description:
        "A right-side sheet keeps the parent content visible while containing one scrolling editing task.",
      source,
      preview: (
        <Sheet>
          <SheetTrigger
            render={<Button variant="outline" className="min-h-11" />}
          >
            Edit question
          </SheetTrigger>
          <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Edit question</SheetTitle>
              <SheetDescription>
                Update one focused part of the current page.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4">
              Sheet content stays focused and can scroll independently.
            </div>
            <SheetFooter className="border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
              <SheetClose
                render={<Button variant="outline" className="min-h-11" />}
              >
                Cancel
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ),
    },
  ],
  variantsAndStates:
    "SheetContent supports top, right, bottom, and left sides. Control open state when saving, validation, or close behavior depends on application state.",
  mobile:
    "Use full width for editing sheets, keep the body independently scrollable, use 44px minimum controls, and add safe-area padding to the footer.",
  accessibility:
    "Always provide SheetTitle and SheetDescription. Focus moves into the sheet, remains trapped while open, and returns to the trigger after closing. Escape and the close control dismiss non-blocking sheets.",
})
