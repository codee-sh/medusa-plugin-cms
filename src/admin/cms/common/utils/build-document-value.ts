import type {
  CmsBlockValue,
  CmsDocumentValue,
} from "../../../../admin-extensions/types"
import type { ClientBlock } from "../../../../lib/block/types"
import type { ClientCollection } from "../../../../lib/collection/types"
import { mapDocumentBlocks } from "../../../../lib/document/map-document-blocks"
import type { BlockPlace } from "../../../../lib/document/types"

/**
 * Picks the values of the fields a config lists, of those the form holds.
 *
 * @param fields - The fields the config lists.
 * @param values - The values the form holds.
 * @returns The values, by field name.
 */
const pickFields = (
  fields: { name: string }[],
  values: Record<string, unknown>
): Record<string, unknown> =>
  Object.fromEntries(
    fields
      .filter(({ name }) => name in values)
      .map(({ name }) => [name, values[name]])
  )

/**
 * Turns a block the form holds into the block a component reads: its type's slug, the fields its type
 * lists and its areas, already turned. A block whose type the collection does not know has neither.
 *
 * @param block - The block as the form holds it, its areas turned.
 * @param place - Where it sits: its type.
 * @returns The block as a component reads it.
 */
const toBlockValue = (
  block: Record<string, unknown>,
  { type }: BlockPlace<ClientBlock>
): Record<string, unknown> => ({
  type: block.block_type,
  fields: type ? pickFields(type.fields, block) : {},
  areas: Object.fromEntries(
    (type?.areas ?? []).map(({ name }) => [
      name,
      Array.isArray(block[name]) ? block[name] : [],
    ])
  ),
})

/**
 * Turns a document form's values into the document a component reads: the document's fields and each
 * area's blocks, with their areas at any depth. It is the one place that knows how the form holds
 * them.
 *
 * @param collection - The collection the document belongs to.
 * @param document - The form's `document` values.
 * @returns The document as a component reads it.
 */
export const buildDocumentValue = (
  collection: ClientCollection,
  document: Record<string, unknown>
): CmsDocumentValue => {
  const blocks = mapDocumentBlocks(collection, document, toBlockValue)

  return {
    fields: pickFields(collection.fields, document),
    areas: Object.fromEntries(
      collection.areas.map(({ name }) => [
        name,
        (Array.isArray(blocks[name]) ? blocks[name] : []) as CmsBlockValue[],
      ])
    ),
  }
}
