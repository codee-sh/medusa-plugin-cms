import type { RichTextDocument, RichTextNode } from "./types"

/**
 * Writes the text an inline node holds: a text node's text, a line break, or a link's text.
 *
 * @param node - The node.
 * @returns Its text.
 */
const formatInlineText = (node: RichTextNode): string => {
  if (node.type === "text") {
    return typeof node.text === "string" ? node.text : ""
  }

  if (node.type === "linebreak") {
    return "\n"
  }

  return (node.children ?? []).map(formatInlineText).join("")
}

/**
 * Writes the lines of a block: one for a paragraph, a heading or a quote, one per item of a list, a
 * nested list's items included.
 *
 * @param node - The block.
 * @returns Its lines.
 */
const formatBlockLines = (node: RichTextNode): string[] => {
  if (node.type === "list") {
    return (node.children ?? []).flatMap(formatBlockLines)
  }

  if (node.type === "listitem") {
    const children = node.children ?? []
    const text = children
      .filter(({ type }) => type !== "list")
      .map(formatInlineText)
      .join("")
    const nested = children
      .filter(({ type }) => type === "list")
      .flatMap(formatBlockLines)

    // An item holding only a nested list has no line of its own.
    return text || !nested.length ? [text, ...nested] : nested
  }

  return [formatInlineText(node)]
}

/**
 * Writes a document's text without its formatting, one line per block and per list item.
 *
 * @param document - The document, or nothing.
 * @returns The text; an empty one for nothing.
 */
export const formatPlainText = (document: RichTextDocument | null): string =>
  document ? document.root.children.flatMap(formatBlockLines).join("\n") : ""
