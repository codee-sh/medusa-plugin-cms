import type { z } from "@medusajs/framework/zod"

/**
 * Tells whether a config's value is a Zod schema, as a config written in JavaScript can give anything.
 *
 * @param value - The value.
 * @returns Whether it parses as a Zod schema does.
 */
export const isZodSchema = (value: unknown): value is z.ZodType =>
  typeof (value as z.ZodType | null | undefined)?.safeParse === "function"
