import { DEFAULT_LINK_POLICY } from "../../sanitize/link-policy"
import type { ResolvedRichTextFeature } from "../types"

/**
 * The built-in features, a field's `defaultFeatures`, resolved: every feature, headings `h2` to `h4`,
 * and links by the default link policy - `http`, `https`, `mailto`, `tel` and relative links.
 */
export const DEFAULT_RICH_TEXT_FEATURES: ResolvedRichTextFeature[] = [
  { key: "bold", props: {} },
  { key: "italic", props: {} },
  { key: "heading", props: { enabledHeadingSizes: ["h2", "h3", "h4"] } },
  { key: "unorderedList", props: {} },
  { key: "orderedList", props: {} },
  { key: "blockquote", props: {} },
  { key: "link", props: { linkPolicy: DEFAULT_LINK_POLICY } },
]
