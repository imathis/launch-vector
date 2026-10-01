import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { defineComponentDoc } from "../docs/types"

const source = `import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

<DropdownMenu>
  <DropdownMenuTrigger render={<Button variant="outline" className="min-h-11" />}>
    Survey actions
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
    <DropdownMenuGroup>
      <DropdownMenuItem className="min-h-11">Edit details</DropdownMenuItem>
      <DropdownMenuItem className="min-h-11" disabled>Make a copy</DropdownMenuItem>
    </DropdownMenuGroup>
    <DropdownMenuSeparator />
    <DropdownMenuGroup>
      <DropdownMenuItem className="min-h-11" variant="destructive">
        Delete survey
      </DropdownMenuItem>
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenu>`

export default defineComponentDoc({
  slug: "dropdown-menu",
  title: "Dropdown menu",
  purpose:
    "Presents a compact set of contextual actions from an anchored trigger.",
  guidance: {
    useWhen:
      "Several secondary actions belong to one item or page and should remain available without competing with the primary action.",
    avoidWhen:
      "The choices change a form value; use Select or Radio Group. Use a bottom Sheet for the same action set on narrow touch layouts when more room is needed.",
  },
  examples: [
    {
      title: "Contextual actions",
      description:
        "Groups related actions, communicates unavailable states, and separates destructive consequences.",
      source,
      preview: (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" className="min-h-11" />}
          >
            Survey actions
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuItem className="min-h-11">
                Edit details
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-11" disabled>
                Make a copy
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="min-h-11" variant="destructive">
                Delete survey
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ],
  variantsAndStates:
    "Items support default and destructive variants plus disabled state. Checkbox and radio items represent persistent choices; submenus are reserved for clearly hierarchical action sets.",
  mobile:
    "Keep the popup within the viewport, avoid long nested submenus, and use 44px minimum item targets on touch layouts. Replace dense menus with a safe-area-aware bottom Sheet when actions need more space.",
  accessibility:
    "Give icon-only triggers an accessible name. Arrow keys move between items, Enter or Space activates an item, Escape closes the menu, and focus returns to the trigger. Keep every item inside a DropdownMenuGroup and use native disabled state for unavailable actions.",
})
