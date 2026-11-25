import { buildConfigError } from "../config/build-config-error"
import type { OptionsHookSource } from "../config/types"
import type { ModelColumn } from "../model/types"

/**
 * Checks a combobox or a relationship whose options a hook gives: it names the hook, and its column is
 * not an enum, whose values a listed set of options states.
 *
 * @param column - The field's column.
 * @param source - The field's options source.
 * @param field - The field's name and type, for error messages.
 * @param path - Where the config sits, for error messages.
 * @throws When the hook has no name or the column is an enum.
 */
export const validateOptionsHook = (
  column: ModelColumn,
  source: OptionsHookSource,
  field: { name: string; type: "combobox" | "relationship" },
  path: string
): void => {
  const where = `${path}: ${field.type} "${field.name}"`

  if (
    !source ||
    typeof source !== "object" ||
    typeof source.hook !== "string" ||
    !source.hook.trim()
  ) {
    throw buildConfigError(`${where} needs a hook name`)
  }

  if (column.choices) {
    throw buildConfigError(
      `${where} takes its options from a hook, so its column must be text, not an enum`
    )
  }
}
