import { $isLinkNode } from "@lexical/link"
import {
  $getSelection,
  $isRangeSelection,
  $setSelection,
  type BaseSelection,
} from "lexical"

/**
 * Puts back a selection saved before the editor lost the focus, widened to the whole link when it was a
 * caret in one, so a link command changes or removes the link whole. Runs inside an editor update.
 *
 * @param selection - The saved selection, or nothing.
 */
export const $restoreLinkSelection = (
  selection: BaseSelection | null
): void => {
  $setSelection(selection?.clone() ?? null)

  const current = $getSelection()

  if ($isRangeSelection(current) && current.isCollapsed()) {
    const anchor = current.anchor.getNode()
    const link = [anchor, ...anchor.getParents()].find($isLinkNode)

    link?.select(0, link.getChildrenSize())
  }
}
