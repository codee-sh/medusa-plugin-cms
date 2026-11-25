/** An option of a combobox, as the dashboard's `Combobox` takes it. */
export type ComboboxOption = {
  value: string
  label: string
  disabled?: boolean
}

/**
 * Stops a combobox of several values from offering more once it holds its most: every option not chosen
 * is disabled, so the editor can only remove one first.
 *
 * @param options - The combobox's options.
 * @param chosen - The values it holds.
 * @param maxItems - The most values it holds; no limit when left out.
 * @returns The options, the ones not chosen disabled when `chosen` holds `maxItems`.
 */
export const limitOptions = (
  options: ComboboxOption[],
  chosen: string[],
  maxItems: number | undefined
): ComboboxOption[] =>
  maxItems === undefined || chosen.length < maxItems
    ? options
    : options.map((option) =>
        chosen.includes(option.value) ? option : { ...option, disabled: true }
      )
