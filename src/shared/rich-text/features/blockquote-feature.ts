import type { RichTextFeatureDefinition, RichTextFeatureOf } from "../types"

/**
 * Quotes, Lexical's `quote` node.
 *
 * @returns The feature.
 */
export const BlockquoteFeature = (): RichTextFeatureOf<"blockquote"> => ({
  key: "blockquote",
  props: {},
})

/** What the check of a document and the editor read for `blockquote`. */
export const BLOCKQUOTE_FEATURE_DEFINITION: RichTextFeatureDefinition<"blockquote"> =
  {
    key: "blockquote",
    nodeTypes: ["quote"],
    missingMessage: "Remove the quotes: this field does not allow them",
  }
