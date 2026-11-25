import { validateUrl } from "../../sanitize/validate-url"
import { UNREADABLE_NODE_MESSAGE } from "../unreadable-node-message"
import type {
  RichTextFeatureDefinition,
  RichTextFeatureOf,
  RichTextFeatureProps,
} from "../types"

/**
 * Links, Lexical's `link` and `autolink` nodes, whose URLs pass the field's link policy.
 *
 * @param props - `linkPolicy`, each key replacing the default policy's.
 * @returns The feature.
 */
export const LinkFeature = (
  props: RichTextFeatureProps["link"] = {}
): RichTextFeatureOf<"link"> => ({ key: "link", props })

/** What the check of a document and the editor read for `link`. */
export const LINK_FEATURE_DEFINITION: RichTextFeatureDefinition<"link"> = {
  key: "link",
  nodeTypes: ["link", "autolink"],
  missingMessage: "Remove the links: this field does not allow them",
  findNodeErrors: (node, { linkPolicy }) => {
    const messages: string[] = []
    const result =
      typeof node.url === "string"
        ? validateUrl(node.url, linkPolicy)
        : UNREADABLE_NODE_MESSAGE

    if (result !== true) {
      messages.push(result)
    }

    if (![undefined, null, "_blank"].includes(node.target as never)) {
      messages.push("Open the link in this tab or in a new one")
    }

    return messages
  },
}
