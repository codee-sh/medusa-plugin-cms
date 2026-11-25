import { buildConfigError } from "../config/build-config-error"
import type { ModelColumn } from "../model/types"
import { isOptionsHookSource } from "./is-options-hook-source"
import type { OptionsFieldConfig } from "./types"
import { validateListedOptions } from "./validate-listed-options"
import { validateOptionsHook } from "./validate-options-hook"

/**
 * Checks a select's or a combobox's options. Only a combobox takes them from a hook: a select shows its
 * few options in a dropdown, with no search and no pages.
 *
 * @param column - The field's column.
 * @param override - The field's config.
 * @param name - The field's name.
 * @param path - Where the config sits, for error messages.
 * @throws At the first problem of its options.
 */
export const validateFieldOptions = (
  column: ModelColumn,
  override: OptionsFieldConfig,
  name: string,
  path: string
): void => {
  const { options } = override

  if (!isOptionsHookSource(options)) {
    validateListedOptions(column, { ...override, options }, name, path)

    return
  }

  if (override.type !== "combobox") {
    throw buildConfigError(
      `${path}: select "${name}" lists its options; options from a hook need type "combobox"`
    )
  }

  validateOptionsHook(column, options, { name, type: "combobox" }, path)
}
