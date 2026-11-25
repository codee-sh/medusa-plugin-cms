import { listWords } from "../list-words"
import type {
  RichTextFeatureDefinition,
  RichTextFeatureOf,
  RichTextFeatureProps,
  RichTextHeading,
} from "../types"

/** Every heading level there is, in order. */
export const RICH_TEXT_HEADINGS: RichTextHeading[] = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]

/** The message of a heading in a field without the feature, or with no level. */
const MISSING_MESSAGE = "Remove the headings: this field does not allow them"

/**
 * Headings, Lexical's `heading` node, of the levels the field offers.
 *
 * @param props - `enabledHeadingSizes`, the levels; `h1` to `h6` when left out.
 * @returns The feature.
 */
export const HeadingFeature = (
  props: RichTextFeatureProps["heading"] = {}
): RichTextFeatureOf<"heading"> => ({ key: "heading", props })

/** What the check of a document and the editor read for `heading`. */
export const HEADING_FEATURE_DEFINITION: RichTextFeatureDefinition<"heading"> =
  {
    key: "heading",
    nodeTypes: ["heading"],
    missingMessage: MISSING_MESSAGE,
    findNodeErrors: (node, { enabledHeadingSizes }) => {
      if (!enabledHeadingSizes.length) {
        return [MISSING_MESSAGE]
      }

      return enabledHeadingSizes.includes(node.tag as RichTextHeading)
        ? []
        : [`Use a heading level of ${listWords(enabledHeadingSizes, "or")}`]
    },
  }
