import { isRichTextEmpty } from "../../shared/rich-text/is-rich-text-empty"
import { parseRichText } from "../../shared/rich-text/parse-rich-text"
import type { RichTextDocument } from "../../shared/rich-text/types"

/**
 * Turns a `richtext` value - a document, the column's JSON or plain text - into the document a write
 * and a version keep, or `null` for nothing or a document without text, as the column stores it.
 *
 * @param value - The value.
 * @returns The document, or `null`.
 */
export const normalizeRichText = (value: unknown): RichTextDocument | null => {
  const document = parseRichText(value)

  return document && !isRichTextEmpty(document) ? document : null
}
