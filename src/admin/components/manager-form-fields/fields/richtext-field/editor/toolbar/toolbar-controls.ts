import { findRichTextFeature } from "../../../../../../../shared/rich-text/find-rich-text-feature"
import type { ToolbarControl } from "../types"
import { BlockTypeMenu } from "./block-type-menu"
import { getBlockTypeOptions } from "../utils/get-block-type-options"
import { listTextFormats } from "../utils/list-text-formats"
import { FormatButtons } from "./format-buttons"
import { HistoryButtons } from "./history-buttons"
import { LinkPopover } from "./link-popover"
import { ListButtons } from "./list-buttons"

/**
 * The toolbar's controls, in its order: undo and redo, the block type menu, the text formats, the lists
 * and the link. Each shows when the field has one of its features or the selection holds what it sets.
 * A new feature's controls join as one more entry.
 */
export const TOOLBAR_CONTROLS: ToolbarControl[] = [
  {
    name: "history",
    isShown: () => true,
    Component: HistoryButtons,
  },
  {
    name: "block-type",
    isShown: ({ features }, selection) =>
      getBlockTypeOptions(features, selection.block).visible,
    Component: BlockTypeMenu,
  },
  {
    name: "format",
    isShown: (settings, selection) =>
      listTextFormats(settings, selection).length > 0,
    Component: FormatButtons,
  },
  {
    name: "list",
    isShown: ({ features }, selection) =>
      findRichTextFeature(features, "unorderedList") !== undefined ||
      findRichTextFeature(features, "orderedList") !== undefined ||
      selection.listType !== null,
    Component: ListButtons,
  },
  {
    name: "link",
    isShown: ({ features }, selection) =>
      findRichTextFeature(features, "link") !== undefined ||
      selection.link !== null,
    Component: LinkPopover,
  },
]
