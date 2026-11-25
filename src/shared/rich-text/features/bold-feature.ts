import type { RichTextFeatureDefinition, RichTextFeatureOf } from "../types"

/**
 * Bold text, Lexical's format bit 1.
 *
 * @returns The feature.
 */
export const BoldFeature = (): RichTextFeatureOf<"bold"> => ({
  key: "bold",
  props: {},
})

/** What the check of a document and the editor read for `bold`. */
export const BOLD_FEATURE_DEFINITION: RichTextFeatureDefinition<"bold"> = {
  key: "bold",
  nodeTypes: [],
  formatBit: 1,
}
