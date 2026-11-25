import { mapMediaRecords } from "./map-media-records"
import { parseRichTextValues } from "./parse-rich-text-values"
import type { MediaRead } from "./types"

/**
 * Turns a document into what a read hands on, in the document and in its blocks at any depth: each
 * media field's record in place of its value, and each `richtext` value as its document. The Admin's
 * read and the store's both start from it.
 *
 * @param document - The document, with its areas under their names: a row or a version's snapshot.
 * @param media - Where the collection's documents hold media, rich text and blocks, and the records
 * `list-cms-document-media` found.
 * @returns The copy.
 */
export const buildReadDocument = (
  document: Record<string, unknown>,
  media: MediaRead
): Record<string, unknown> =>
  mapMediaRecords(parseRichTextValues(document, media.placement), media)
