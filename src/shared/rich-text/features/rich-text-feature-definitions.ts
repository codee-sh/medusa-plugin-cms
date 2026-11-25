import type { RichTextFeatureDefinition, RichTextFeatureKey } from "../types"
import { BLOCKQUOTE_FEATURE_DEFINITION } from "./blockquote-feature"
import { BOLD_FEATURE_DEFINITION } from "./bold-feature"
import { HEADING_FEATURE_DEFINITION } from "./heading-feature"
import { ITALIC_FEATURE_DEFINITION } from "./italic-feature"
import { LINK_FEATURE_DEFINITION } from "./link-feature"
import { ORDERED_LIST_FEATURE_DEFINITION } from "./ordered-list-feature"
import { UNORDERED_LIST_FEATURE_DEFINITION } from "./unordered-list-feature"

/**
 * Every built-in feature's definition, by its key: what the check of a document and the editor read
 * for it. A new feature joins as one more entry.
 */
export const RICH_TEXT_FEATURE_DEFINITIONS: {
  [TKey in RichTextFeatureKey]: RichTextFeatureDefinition<TKey>
} = {
  bold: BOLD_FEATURE_DEFINITION,
  italic: ITALIC_FEATURE_DEFINITION,
  heading: HEADING_FEATURE_DEFINITION,
  unorderedList: UNORDERED_LIST_FEATURE_DEFINITION,
  orderedList: ORDERED_LIST_FEATURE_DEFINITION,
  blockquote: BLOCKQUOTE_FEATURE_DEFINITION,
  link: LINK_FEATURE_DEFINITION,
}
