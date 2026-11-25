import { buildConfigError } from "../config/build-config-error"
import { describeInputJsonSchema } from "./describe-input-json-schema"
import { isZodSchema } from "./is-zod-schema"
import type { RegistryField, ValidationKey } from "./types"

/**
 * Checks one of a model's rules: a Zod object schema whose keys are fields of the model, so a typo in a
 * key fails at start rather than leaving a rule that never sees its value.
 *
 * @param fields - The model's fields.
 * @param key - The config's key the rule sits under.
 * @param schema - The rule, as the config gives it.
 * @param path - Where the config sits, for error messages.
 * @throws When the rule is not a Zod object schema, or names a key that is no field of the model.
 */
export const validateModelSchema = (
  fields: RegistryField[],
  key: ValidationKey,
  schema: unknown,
  path: string
): void => {
  if (schema === undefined) {
    return
  }

  if (!isZodSchema(schema)) {
    throw buildConfigError(`${path}: "${key}" is not a Zod schema`)
  }

  const json = describeInputJsonSchema(schema)

  if (json?.type !== "object") {
    throw buildConfigError(
      `${path}: "${key}" must describe an object of the model's fields`
    )
  }

  const unknownKey = Object.keys(json.properties ?? {}).find(
    (name) => !fields.some((field) => field.name === name)
  )

  if (unknownKey !== undefined) {
    throw buildConfigError(
      `${path}: "${key}" names "${unknownKey}", which is no field of the model`
    )
  }
}
