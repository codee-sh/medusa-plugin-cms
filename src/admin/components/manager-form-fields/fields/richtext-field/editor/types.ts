import type { ComponentType } from "react"
import type {
  RichTextHeading,
  RichTextSettings,
} from "../../../../../../shared/rich-text/types"

/** A block type the block type control sets: a paragraph, a heading level or a quote. */
export type RichTextBlockType = "paragraph" | RichTextHeading | "quote"

/** The block the selection sits in: one the block type control sets, or a list, which the list control sets. */
export type CurrentBlockType = RichTextBlockType | "list"

/** What the toolbar shows of the selection. */
export type SelectionState = {
  bold: boolean
  italic: boolean
  /** The block the selection starts in; `null` without a selection. */
  block: CurrentBlockType | null
  /** The kind of the list the selection sits in, the innermost one; `null` outside a list. */
  listType: "bullet" | "number" | null
  /** The link the selection sits in; `null` outside a link. */
  link: { url: string; target: string | null } | null
  /** Whether the selection is a caret, which no link can be made from. */
  isCollapsed: boolean
}

/** What every toolbar control gets. */
export type ToolbarControlProps = {
  settings: RichTextSettings
  selection: SelectionState
  disabled?: boolean
}

/**
 * A group of the toolbar: the controls of one or more features, shown when the field has one of them or
 * the selection holds what they set, so a stored document can be cleaned up. The toolbar renders every
 * control it is given the same way, in its order.
 */
export type ToolbarControl = {
  /** Unique among the toolbar's controls. */
  name: string
  /**
   * Whether the control shows for the field and the selection.
   *
   * @param settings - The field's features, each with its options.
   * @param selection - What the selection holds.
   * @returns Whether to render the control.
   */
  isShown: (settings: RichTextSettings, selection: SelectionState) => boolean
  Component: ComponentType<ToolbarControlProps>
}
