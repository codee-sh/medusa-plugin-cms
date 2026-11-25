import { isRichTextDocument } from "./is-rich-text-document"
import type { RichTextDocument, RichTextNode } from "./types"

/**
 * Builds a paragraph holding one line of plain text, as Lexical serializes it.
 *
 * @param line - The line; an empty one makes an empty paragraph.
 * @returns The paragraph.
 */
const buildParagraph = (line: string): RichTextNode => ({
  type: "paragraph",
  version: 1,
  direction: null,
  format: "",
  indent: 0,
  textFormat: 0,
  textStyle: "",
  children: line
    ? [
        {
          type: "text",
          version: 1,
          text: line,
          format: 0,
          style: "",
          mode: "normal",
          detail: 0,
        },
      ]
    : [],
})

/**
 * Builds a document of plain text, one paragraph per line.
 *
 * @param text - The text.
 * @returns The document.
 */
const buildPlainTextDocument = (text: string): RichTextDocument => ({
  root: {
    type: "root",
    version: 1,
    direction: null,
    format: "",
    indent: 0,
    children: text.split(/\r?\n/).map(buildParagraph),
  },
})

/**
 * Tries to read a text as a document's JSON.
 *
 * @param text - The text.
 * @returns The document, or nothing when the text is not one.
 */
const parseDocumentJson = (text: string): RichTextDocument | undefined => {
  try {
    const parsed: unknown = JSON.parse(text)

    return isRichTextDocument(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * Turns what a rich text field holds into a document: the JSON text its column stores, a document
 * already parsed, or nothing. A text that is not a document's JSON - the column held plain text before
 * the field was rich text - becomes one paragraph per line. The nodes are not checked.
 *
 * @param value - The column's text, a document, or nothing.
 * @returns The document, or `null` for an empty text, `null`, or a value of another kind.
 */
export const parseRichText = (value: unknown): RichTextDocument | null => {
  if (isRichTextDocument(value)) {
    return value
  }

  if (typeof value !== "string" || !value) {
    return null
  }

  return parseDocumentJson(value) ?? buildPlainTextDocument(value)
}
