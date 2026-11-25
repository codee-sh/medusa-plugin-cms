import type { RichTextFeatureDefinition, RichTextFeatureOf } from "../types"

/**
 * Bulleted lists, Lexical's `list` of `listType` `bullet` and its `listitem`.
 *
 * @returns The feature.
 */
export const UnorderedListFeature = (): RichTextFeatureOf<"unorderedList"> => ({
  key: "unorderedList",
  props: {},
})

/** What the check of a document and the editor read for `unorderedList`. */
export const UNORDERED_LIST_FEATURE_DEFINITION: RichTextFeatureDefinition<"unorderedList"> =
  {
    key: "unorderedList",
    nodeTypes: ["list", "listitem"],
    ownsNode: (node) => node.type !== "list" || node.listType === "bullet",
    missingMessage: "Remove the bulleted lists: this field does not allow them",
  }
