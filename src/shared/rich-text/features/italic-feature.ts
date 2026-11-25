import type { RichTextFeatureDefinition, RichTextFeatureOf } from "../types"

/**
 * Italic text, Lexical's format bit 2.
 *
 * @returns The feature.
 */
export const ItalicFeature = (): RichTextFeatureOf<"italic"> => ({
  key: "italic",
  props: {},
})

/** What the check of a document and the editor read for `italic`. */
export const ITALIC_FEATURE_DEFINITION: RichTextFeatureDefinition<"italic"> = {
  key: "italic",
  nodeTypes: [],
  formatBit: 2,
}
