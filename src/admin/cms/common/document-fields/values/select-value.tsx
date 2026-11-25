import { isOptionsHookSource } from "../../../../../lib/field/is-options-hook-source"
import { labelOptionValues } from "../../utils/label-option-values"
import type { DocumentValueProps } from "./types"

/**
 * The read-only view of a `select` field: its value by the label of the option its config lists.
 *
 * @param props - The field and its value.
 */
export const SelectValue = ({ field, value }: DocumentValueProps) => (
  <>
    {labelOptionValues(
      value,
      isOptionsHookSource(field.options) ? [] : (field.options ?? [])
    )}
  </>
)
