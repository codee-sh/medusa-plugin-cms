import type { ReadPlacement } from "./types"
import { mapDocumentBlocks } from "./map-document-blocks"
import { parseRichTextFields } from "./parse-rich-text-fields"

/**
 * Turns each `richtext` value of a document and of its blocks, at any depth, into its document, as a
 * read hands it on: the column's JSON parsed, plain text as one paragraph per line, a document kept as
 * it is.
 *
 * @param document - The document, with its areas under their names: a row or a version's snapshot.
 * @param placement - Where the collection's documents hold `richtext` fields.
 * @returns The copy.
 */
export const parseRichTextValues = (
  document: Record<string, unknown>,
  placement: ReadPlacement
): Record<string, unknown> =>
  mapDocumentBlocks(
    placement,
    parseRichTextFields(document, placement.richTextFields),
    (block, { type }) => parseRichTextFields(block, type?.richTextFields ?? [])
  )
