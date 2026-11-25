/**
 * Lists the values a media field holds: an array's texts, or the one text. Anything else, such as an
 * empty text or `null`, holds no value; the schema refuses what is not a text.
 *
 * @param value - The field's value.
 * @returns The values.
 */
export const listHeldValues = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (held): held is string => typeof held === "string" && held !== ""
  )
