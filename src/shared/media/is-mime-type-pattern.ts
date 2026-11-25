/** A MIME type or a `type/*`, of the characters RFC 6838 allows in a name. */
const MIME_TYPE_PATTERN =
  /^[a-z0-9][a-z0-9!#$&^_.+-]*\/(?:\*|[a-z0-9][a-z0-9!#$&^_.+-]*)$/i

/**
 * Tells whether a value is a MIME type a config may list: `image/png`, or `image/*` for every subtype.
 *
 * @param value - The value.
 * @returns Whether it is one.
 */
export const isMimeTypePattern = (value: unknown): value is string =>
  typeof value === "string" && MIME_TYPE_PATTERN.test(value)
