import type { RichTextDocument } from "./types"

/**
 * Tells whether a value has the shape of a rich text document: an object whose `root` is a node of type
 * `root` with a list of children. The nodes inside are not checked.
 *
 * @param value - The value.
 * @returns Whether it is a document.
 */
export const isRichTextDocument = (
  value: unknown
): value is RichTextDocument => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const root = (value as { root?: unknown }).root

  return (
    typeof root === "object" &&
    root !== null &&
    (root as { type?: unknown }).type === "root" &&
    Array.isArray((root as { children?: unknown }).children)
  )
}
