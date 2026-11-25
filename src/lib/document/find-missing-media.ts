import { findMediaRecord } from "./find-media-record"
import { listMediaSlots } from "./list-media-slots"
import type { DocumentError, MediaRead } from "./types"

/**
 * Finds each media value of a document that the provider found no record for, at its field's path.
 *
 * @param document - The submitted document, with its areas under their names.
 * @param media - Where the documents hold media, and the records found.
 * @returns One error per field holding such a value.
 */
export const findMissingMedia = (
  document: Record<string, unknown>,
  { placement, records }: MediaRead
): DocumentError[] =>
  listMediaSlots(document, placement).flatMap(({ field, path, values }) => {
    const missing = values.find(
      (value) => !findMediaRecord(records, field.stores!, value)
    )

    return missing === undefined
      ? []
      : [{ path, message: `The file "${missing}" was not found` }]
  })
