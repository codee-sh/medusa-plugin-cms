---
{"title": "A menu that gives focus back scrolls to a moved trigger", "modules": ["cms"], "areas": ["admin"], "topics": ["ui"]}
---

# A menu that gives focus back scrolls to a moved trigger

A Radix dropdown - `DropdownMenu` from `@medusajs/ui`, and the dashboard's `ActionMenu` built on it -
gives focus back to its trigger when it closes. When the item picked adds content above the trigger,
the trigger has moved down by the time focus returns, and the browser scrolls it into view. The page
jumps: under **Add block**, a new card opened above the button, and the editor landed on the bottom
half of that card (2026-11-10).

`ActionMenu` takes no props for its content, so it cannot turn this off. The fix is the menu's own
`DropdownMenu.Content` with `onCloseAutoFocus={(event) => event.preventDefault()}`, which leaves focus
and the scroll where they are (`src/admin/cms/common/area-field/area-field.tsx`). The user confirmed
the jump gone.

Rule: a menu whose item inserts content above its trigger, such as an add button under a list, uses
`DropdownMenu` with `onCloseAutoFocus` prevented, not `ActionMenu`. A row's or a section's `...` menu
stays on `ActionMenu`.
