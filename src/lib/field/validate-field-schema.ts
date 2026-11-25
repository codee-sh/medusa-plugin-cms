import { buildConfigError } from "../config/build-config-error"
import { describeInputJsonSchema } from "./describe-input-json-schema"
import { isZodSchema } from "./is-zod-schema"
import type { RegistryField, ValidationKey } from "./types"

/**
 * Lists the JSON Schema types a schema of a field may describe: the type of the value the plugin hands
 * it, a date as its ISO text and a field of several values as a list.
 *
 * @param field - The field.
 * @returns The types, the first of them named in an error message.
 */
const listSchemaTypes = (field: RegistryField): string[] => {
  switch (field.kind) {
    case "number":
      return ["number", "integer"]
    case "boolean":
      return ["boolean"]
    case "text_list":
      return ["array"]
    case "combobox":
    case "media":
      return field.multiple ? ["array"] : ["string"]
    case "text":
    case "url":
    case "slug":
    case "date":
    case "select":
    case "relationship":
      return ["string"]
    case "richtext":
      return ["object"]
  }
}

/**
 * Finds the value type a schema's JSON Schema describes. A schema that lets an empty value through, as
 * `.nullish()` makes one, describes its type beside `null`: as a list of types for a plain one,
 * `["string", "null"]`, or in `anyOf` for one with constraints.
 *
 * @param json - The schema's JSON Schema, from `describeInputJsonSchema`.
 * @returns The type, or `undefined` when the schema has none JSON Schema can describe.
 */
const findSchemaValueType = (
  json: ReturnType<typeof describeInputJsonSchema>
): unknown => {
  if (!json) {
    return undefined
  }

  const types = json.anyOf
    ? json.anyOf.map(({ type }) => type)
    : [json.type].flat()
  const valueTypes = types.filter((type) => type !== "null")

  return valueTypes.length === 1 ? valueTypes[0] : undefined
}

/**
 * Checks one of a field's schemas: a Zod schema describing values of the type the plugin hands it, so
 * `z.number()` on a text column fails at start rather than at the first save.
 *
 * @param field - The field.
 * @param key - The config's key the schema sits under.
 * @param schema - The schema, as the config gives it.
 * @param path - Where the config sits, for error messages.
 * @throws When the schema does not fit the field.
 */
export const validateFieldSchema = (
  field: RegistryField,
  key: ValidationKey,
  schema: unknown,
  path: string
): void => {
  if (schema === undefined) {
    return
  }

  const where = `${path}: "${field.name}"`

  if (!isZodSchema(schema)) {
    throw buildConfigError(`${where} has a "${key}" that is not a Zod schema`)
  }

  const types = listSchemaTypes(field)
  const type = findSchemaValueType(describeInputJsonSchema(schema))

  if (typeof type !== "string" || !types.includes(type)) {
    const article = /^[aeiou]/.test(types[0]) ? "an" : "a"

    throw buildConfigError(
      `${where} is a ${field.kind} field, so its "${key}" must describe ${article} ${types[0]}`
    )
  }
}
