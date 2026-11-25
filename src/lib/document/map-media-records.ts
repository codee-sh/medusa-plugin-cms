import { mapDocumentBlocks } from "./map-document-blocks"
import type { RegistryField } from "../field/types"
import { findMediaRecord } from "./find-media-record"
import { listHeldValues } from "./list-held-values"
import type { CmsMedia } from "../media-provider/types"
import type { MediaRead, MediaRecords } from "./types"

/**
 * Puts each media field's record in place of its value in a copy of the document or the block that
 * holds it. A field holding `null` or nothing stays as it is; a single field holding a value no record
 * matches, an empty text included, answers `null`, and a list leaves such values out.
 *
 * @param owner - The document or the block.
 * @param fields - Its media fields.
 * @param records - The records found.
 * @returns The copy.
 */
const mapFieldRecords = (
  owner: Record<string, unknown>,
  fields: RegistryField[],
  records: MediaRecords
): Record<string, unknown> => ({
  ...owner,
  ...Object.fromEntries(
    fields
      .filter(({ name }) => owner[name] !== null && owner[name] !== undefined)
      .map((field) => {
        const values = listHeldValues(owner[field.name])

        return [
          field.name,
          field.multiple
            ? values
                .map((value) => findMediaRecord(records, field.stores!, value))
                .filter((record): record is CmsMedia => record !== undefined)
            : (findMediaRecord(records, field.stores!, values[0]) ?? null),
        ]
      })
  ),
})

/**
 * Puts each media field's record in place of its value, in a copy of the document and its blocks at any
 * depth: one file as its record, `null` when none was found; several as their records in the stored
 * order, without the ones not found. A field holding `null` or nothing stays as it is.
 *
 * @param document - The document, with its areas under their names.
 * @param media - Where the documents hold media, and the records found.
 * @returns The document with the records.
 */
export const mapMediaRecords = (
  document: Record<string, unknown>,
  { placement, records }: MediaRead
): Record<string, unknown> =>
  mapDocumentBlocks(
    placement,
    mapFieldRecords(document, placement.mediaFields, records),
    (block, { type }) =>
      mapFieldRecords(block, type?.mediaFields ?? [], records)
  )
