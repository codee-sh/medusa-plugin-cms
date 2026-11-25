import { findRichTextFeature } from "../../../../../../../shared/rich-text/find-rich-text-feature"
import type { ResolvedRichTextFeature } from "../../../../../../../shared/rich-text/types"
import type { CurrentBlockType, RichTextBlockType } from "../types"

/** What the block type control offers, and whether it shows at all. */
export type BlockTypeOptions = {
  /** The block types the field allows: a paragraph always, then its headings and its quote. */
  options: RichTextBlockType[]
  visible: boolean
}

/**
 * Lists the block types the block type control offers: a paragraph, the heading feature's sizes and a
 * quote with the blockquote feature. It shows when the field has headings or quotes, and also while the
 * selection sits in a block the field does not allow, so a stored heading or quote can be turned into a
 * paragraph.
 *
 * @param features - The field's features.
 * @param current - The block the selection sits in, or nothing without a selection.
 * @returns The options, and whether the control shows.
 */
export const getBlockTypeOptions = (
  features: ResolvedRichTextFeature[],
  current: CurrentBlockType | null
): BlockTypeOptions => {
  const heading = findRichTextFeature(features, "heading")
  const options: RichTextBlockType[] = [
    "paragraph",
    ...(heading?.props.enabledHeadingSizes ?? []),
    ...(findRichTextFeature(features, "blockquote")
      ? (["quote"] as const)
      : []),
  ]
  const outside =
    current !== null &&
    current !== "list" &&
    !options.includes(current as RichTextBlockType)

  return { options, visible: options.length > 1 || outside }
}
