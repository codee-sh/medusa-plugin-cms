import type { ClientCollection } from "../../../lib/collection/types"
import { listDocumentBlocks } from "../../../lib/document/list-document-blocks"
import type { Field } from "../../../lib/field/types"
import type { CmsMedia } from "../../../lib/media-provider/types"

/**
 * Tells whether a value is a media record, as a read puts it in place of a field's value.
 *
 * @param value - The value.
 * @returns Whether it is an object with an `id` and a `url`.
 */
const isMediaRecord = (value: unknown): value is CmsMedia =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as CmsMedia).id === "string" &&
  typeof (value as CmsMedia).url === "string"

/**
 * Lists the records a read holds in place of the values of a document's media fields and its blocks',
 * at any depth.
 *
 * @param collection - The document's collection, with the block types its areas reach.
 * @param content - The document as read, with its areas under their names.
 * @returns The records.
 */
export const collectFormMedia = (
  collection: ClientCollection,
  content: Record<string, unknown>
): CmsMedia[] => {
  /**
   * Lists the records an object holds in its media fields.
   *
   * @param owner - The document or a block.
   * @param fields - Its fields.
   * @returns The records.
   */
  const recordsOf = (owner: Record<string, unknown>, fields: Field[]) =>
    fields
      .filter(({ kind }) => kind === "media")
      .flatMap(({ name }) => {
        const value = owner[name]
        return (Array.isArray(value) ? value : [value]).filter(isMediaRecord)
      })

  return [
    ...recordsOf(content, collection.fields),
    ...listDocumentBlocks(collection, content).flatMap(({ block, type }) =>
      type ? recordsOf(block, type.fields) : []
    ),
  ]
}
