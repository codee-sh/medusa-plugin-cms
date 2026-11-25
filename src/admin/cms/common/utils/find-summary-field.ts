import type { ClientBlock } from "../../../../lib/block/types"
import type { Field } from "../../../../lib/field/types"

/**
 * Finds the field whose value names a block where its fields are not shown: its first editable text
 * field.
 *
 * @param type - The block type.
 * @returns The field, or nothing for a type without one.
 */
export const findSummaryField = (type: ClientBlock): Field | undefined =>
  type.fields.find(({ kind }) => kind === "text")
