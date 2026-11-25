/** The start of the value a chosen file holds in the form until a save uploads it. */
const PENDING_PREFIX = "pending:"

/**
 * Makes the value a chosen file holds in its field until a save uploads it.
 *
 * @returns A value no stored id or URL can take.
 */
export const createPendingMediaValue = (): string =>
  `${PENDING_PREFIX}${crypto.randomUUID()}`

/**
 * Tells whether a field's value is a chosen file not uploaded yet.
 *
 * @param value - The value.
 * @returns Whether it is the value of a chosen file.
 */
export const isPendingMediaValue = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith(PENDING_PREFIX)
