import type { SelectGroupOption, SelectOption } from "../../../types"
import type { ComboboxOption } from "./limit-options"

/**
 * Turns a field's listed options into the combobox's, groups flattened.
 *
 * @param options - The options its config lists, or groups of them.
 * @returns The combobox's options.
 */
export const toComboboxOptions = (
  options: SelectOption[] | SelectGroupOption[] = []
): ComboboxOption[] =>
  options
    .flatMap((option) => ("groupName" in option ? option.options : [option]))
    .map(({ value, name }) => ({ value, label: name }))
