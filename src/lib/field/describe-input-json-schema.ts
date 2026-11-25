import { z } from "@medusajs/framework/zod"

/** The parts of a JSON Schema the registry's checks read. */
type InputJsonSchema = {
  type?: unknown
  anyOf?: { type?: unknown }[]
  properties?: Record<string, unknown>
}

/**
 * Describes a Zod schema as JSON Schema, the one part of it the registry can read as data: its input,
 * what the plugin hands it, so a transform over the right type passes.
 *
 * @param schema - The schema.
 * @returns The JSON Schema, or `undefined` when JSON Schema cannot describe it.
 */
export const describeInputJsonSchema = (
  schema: z.ZodType
): InputJsonSchema | undefined => {
  try {
    return z.toJSONSchema(schema, { io: "input" }) as InputJsonSchema
  } catch {
    return undefined
  }
}
