import { listDocumentBlocks } from "./list-document-blocks"
import type { RegistryField } from "../field/types"
import type { ReadPlacement } from "./types"
import { listHeldValues } from "./list-held-values"

/** A media field of a document or of one of its blocks, with the values it holds. */
export type MediaSlot = {
  field: RegistryField
  /** The field's path in the document: `cover`, `sections.2.image`, `sections.2.tips.0.image`. */
  path: string
  /** The values the field holds, in their order: one for a single file, the texts only, none empty. */
  values: string[]
}

/**
 * Lists each media field of a document and of each of its blocks at any depth, with its path and the
 * values it holds.
 *
 * @param document - The document, with its areas under their names.
 * @param placement - Where the collection's documents hold media.
 * @returns The fields, the document's first, then its blocks' in the document's order.
 */
export const listMediaSlots = (
  document: Record<string, unknown>,
  placement: ReadPlacement
): MediaSlot[] => [
  ...placement.mediaFields.map((field) => ({
    field,
    path: field.name,
    values: listHeldValues(document[field.name]),
  })),
  ...listDocumentBlocks(placement, document).flatMap(({ block, path, type }) =>
    (type?.mediaFields ?? []).map((field) => ({
      field,
      path: `${path}.${field.name}`,
      values: listHeldValues(block[field.name]),
    }))
  ),
]
