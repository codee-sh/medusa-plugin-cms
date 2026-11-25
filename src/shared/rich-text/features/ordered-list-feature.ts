import type { RichTextFeatureDefinition, RichTextFeatureOf } from "../types"

/**
 * Numbered lists, Lexical's `list` of `listType` `number` and its `listitem`.
 *
 * @returns The feature.
 */
export const OrderedListFeature = (): RichTextFeatureOf<"orderedList"> => ({
  key: "orderedList",
  props: {},
})

/** What the check of a document and the editor read for `orderedList`. */
export const ORDERED_LIST_FEATURE_DEFINITION: RichTextFeatureDefinition<"orderedList"> =
  {
    key: "orderedList",
    nodeTypes: ["list", "listitem"],
    ownsNode: (node) => node.type !== "list" || node.listType === "number",
    missingMessage: "Remove the numbered lists: this field does not allow them",
  }
