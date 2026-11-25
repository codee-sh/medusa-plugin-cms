import type { ModelColumn } from "../model/types"

/**
 * Tells whether the model itself makes a column required: not nullable, and without a default.
 *
 * @param column - The column.
 * @returns Whether every save needs a value.
 */
export const isRequiredByModel = (column: ModelColumn): boolean =>
  !column.nullable && !column.hasDefault
