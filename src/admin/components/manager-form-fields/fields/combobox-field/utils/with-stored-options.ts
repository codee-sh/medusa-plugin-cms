import type { ComboboxOption } from "./limit-options"

/**
 * Keeps a combobox showing what it holds: every held value no option has is put first as an option of
 * its own, so the input is not empty over a value the form still holds, and the editor can remove it.
 *
 * @param options - The combobox's options.
 * @param stored - The values it holds.
 * @param labelOf - Builds the label of a value no option has.
 * @returns The options, with the missing values first; the same list when none is missing.
 */
export const withStoredOptions = (
  options: ComboboxOption[],
  stored: string[],
  labelOf: (value: string) => string
): ComboboxOption[] => {
  const missing = stored.filter(
    (value) => !options.some((option) => option.value === value)
  )

  return missing.length
    ? [
        ...missing.map((value) => ({ value, label: labelOf(value) })),
        ...options,
      ]
    : options
}
