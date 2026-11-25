import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text"
import { $setBlocksType } from "@lexical/selection"
import { $createParagraphNode, $getSelection, $isRangeSelection } from "lexical"
import type { RichTextBlockType } from "../types"

/**
 * Creates the node a block type stands for.
 *
 * @param type - The block type.
 * @returns A new, empty block of that type.
 */
const $createBlock = (type: RichTextBlockType) => {
  if (type === "paragraph") {
    return $createParagraphNode()
  }

  return type === "quote" ? $createQuoteNode() : $createHeadingNode(type)
}

/**
 * Turns the selected blocks into a block type, keeping their text. Runs inside an editor update; without
 * a range selection it changes nothing.
 *
 * @param type - The block type to set.
 */
export const $setBlockType = (type: RichTextBlockType): void => {
  const selection = $getSelection()

  if ($isRangeSelection(selection)) {
    $setBlocksType(selection, () => $createBlock(type))
  }
}
