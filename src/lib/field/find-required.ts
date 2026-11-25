import type { RegistryField, FieldSchemas } from "./types"

/**
 * Works out when a field must be filled from its schemas, by asking each whether an empty value, which
 * reaches it as `null`, passes: `always` when the schema of every save refuses it, `publish` when only
 * the schema of a publish does.
 *
 * @param schemas - The field's schemas.
 * @returns The word the projection carries, or `undefined` when the field may stay empty.
 */
export const findRequired = ({
  save,
  publish,
}: FieldSchemas): RegistryField["required"] => {
  if (save && !save.safeParse(null).success) {
    return "always"
  }

  if (publish && !publish.safeParse(null).success) {
    return "publish"
  }

  return undefined
}
