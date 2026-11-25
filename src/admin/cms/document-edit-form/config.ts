import { z } from "zod"
import type { ClientBlock } from "../../../lib/block/types"
import type { ClientCollection } from "../../../lib/collection/types"
import { buildDocumentSchema } from "../../../lib/document/build-document-schema"
import { mapDocumentBlocks } from "../../../lib/document/map-document-blocks"
import { buildFieldDefaults } from "../common/utils/build-field-defaults"
import type { DocumentFormValues } from "../common/types"
import type {
  BlockPlace,
  DocumentSchemaMode,
} from "../../../lib/document/types"
import type { Field } from "../../../lib/field/types"

/**
 * Turns a stored block into the values its card starts from: its id, its type, its fields' values and
 * its areas, already turned, an area without blocks as an empty list. A block of a type its area
 * does not allow keeps its id and type only, which is how a save sends it.
 *
 * @param block - The block as stored, its areas turned.
 * @param place - Where it sits: its area and its type.
 * @returns The block's form values.
 */
const buildBlockDefaults = (
  block: Record<string, unknown>,
  { area, type }: BlockPlace<ClientBlock>
): Record<string, unknown> => {
  const kept = { id: block.id, block_type: block.block_type }

  if (!type || !area.blocks.includes(type.slug)) {
    return kept
  }

  return {
    ...kept,
    ...buildFieldDefaults(type.fields, block),
    ...Object.fromEntries(
      type.areas.map(({ name }) => [name, block[name] ?? []])
    ),
  }
}

/**
 * Turns a stored document into the values its form starts from: its fields' values and each area's
 * blocks at any depth, an area without blocks as an empty list.
 *
 * @param collection - The document's collection.
 * @param fields - The form's fields.
 * @param document - The document as the server returns it, or its latest version's content.
 * @returns The form's values.
 */
export const buildEditDefaults = (
  collection: ClientCollection,
  fields: Field[],
  document: Record<string, unknown>
): DocumentFormValues => {
  const blocks = mapDocumentBlocks(collection, document, buildBlockDefaults)

  return {
    document: {
      ...buildFieldDefaults(fields, document),
      ...Object.fromEntries(
        collection.areas.map(({ name }) => [name, blocks[name] ?? []])
      ),
    },
  }
}

/**
 * Turns an emptied input into `null`, which clears its column whatever its kind.
 *
 * @param value - The input's value.
 * @returns `null` for an empty text or an empty list, the value otherwise.
 */
const emptyValueToNull = (value: unknown): unknown =>
  value === "" || (Array.isArray(value) && value.length === 0) ? null : value

/**
 * Sends every emptied input as `null`, the document's and its blocks' at any depth, and keeps each
 * area a list, an empty one included.
 *
 * @param collection - The document's collection.
 * @returns The preprocessor of the form's values.
 */
const emptyToNull =
  (collection: ClientCollection) =>
  (document: unknown): unknown => {
    const values = mapDocumentBlocks(
      collection,
      document as Record<string, unknown>,
      (block, { type }) =>
        Object.fromEntries(
          Object.entries(block).map(([column, value]) => [
            column,
            type?.areas.some(({ name }) => name === column)
              ? value
              : emptyValueToNull(value),
          ])
        )
    )

    return Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        collection.areas.some(({ name }) => name === key)
          ? value
          : emptyValueToNull(value),
      ])
    )
  }

/**
 * Builds the form's schema from the collection's schema, the one the server checks, over the fields the
 * form shows and the collection's areas: `shape` for a draft, `publish` for a published document, which
 * keeps what its publish required.
 *
 * @param collection - The collection the document belongs to.
 * @param mode - The schema's mode.
 * @returns The schema.
 */
export const buildEditSchema = (
  collection: ClientCollection,
  mode: DocumentSchemaMode
) =>
  // The document schema is built from the config at runtime, so its type is only the form's values.
  z.object({
    document: z.preprocess(
      emptyToNull(collection),
      // The form leaves out the fields it does not show, so only those it holds are required.
      buildDocumentSchema(z, collection, { mode, partial: true })
    ),
  }) as unknown as z.ZodType<DocumentFormValues, DocumentFormValues>

/**
 * Builds the body of a save: the values to send without the areas left as they opened, so the server
 * keeps their rows as they are, and the number of the version the form edits.
 *
 * @param collection - The document's collection.
 * @param values - The values to send, the chosen files uploaded.
 * @param current - The form's values as the editor left them.
 * @param defaults - The values the form opened with.
 * @param baseVersion - The number of the version the form edits; `null` for a document without versions.
 * @returns The body.
 */
export const buildUpdatePayload = (
  collection: ClientCollection,
  values: Record<string, unknown>,
  current: Record<string, unknown>,
  defaults: Record<string, unknown>,
  baseVersion: number | null
): Record<string, unknown> => {
  const unchangedAreas = collection.areas
    .map(({ name }) => name)
    .filter(
      (name) => JSON.stringify(current[name]) === JSON.stringify(defaults[name])
    )

  return {
    ...Object.fromEntries(
      Object.entries(values).filter(([key]) => !unchangedAreas.includes(key))
    ),
    base_version: baseVersion,
  }
}
