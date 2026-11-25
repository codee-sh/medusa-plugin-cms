import type { RegistryField } from "../field/types"
import { listPublicFields } from "../field/list-public-fields"

/** The columns every document has and the store answers, beside its fields. */
const DOCUMENT_STORE_COLUMNS = ["id", "published_at", "updated_at"]

/**
 * Lists a collection's columns the store answers: the document's own, `metadata` when the model has it,
 * which the store answers whole, and the public fields.
 *
 * @param fields - The collection's fields.
 * @param hasMetadata - Whether the model has a `metadata` column.
 * @returns The column names.
 */
export const listStoreColumns = (
  fields: RegistryField[],
  hasMetadata: boolean
): string[] => [
  ...DOCUMENT_STORE_COLUMNS,
  ...(hasMetadata ? ["metadata"] : []),
  ...listPublicFields(fields),
]
