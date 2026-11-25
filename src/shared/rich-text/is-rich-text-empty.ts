import type { RichTextDocument, RichTextNode } from "./types"

/**
 * Tells whether a node holds text, itself or in any node under it.
 *
 * @param node - The node.
 * @returns Whether a text node with text sits in it.
 */
const hasText = (node: RichTextNode): boolean =>
  (node.type === "text" && typeof node.text === "string" && node.text !== "") ||
  (Array.isArray(node.children) && node.children.some(hasText))

/**
 * Tells whether a document holds no text: what an empty editor saves, an empty paragraph or line
 * breaks only included. A field stores such a document as `null`.
 *
 * @param document - The document, or nothing.
 * @returns Whether it is empty.
 */
export const isRichTextEmpty = (document: RichTextDocument | null): boolean =>
  !document || !hasText(document.root)
