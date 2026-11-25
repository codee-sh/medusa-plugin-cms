/** How a refused save or publish from an outdated form ends, so the Admin can offer a reload. */
const STALE_VERSION_HINT = "Reload to see it."

/**
 * Writes the message of a save or publish made from a version that is no longer the latest.
 *
 * @param version - The latest version's number, or `null` when the document has none.
 * @param savedBy - Who saved the latest version, when known.
 * @returns The message.
 */
export const formatStaleVersionMessage = (
  version: number | null,
  savedBy?: string | null
): string =>
  version === null
    ? `The document changed after you opened it. ${STALE_VERSION_HINT}`
    : `Version ${version} was saved${savedBy ? ` by ${savedBy}` : ""} after the one you edited. ${STALE_VERSION_HINT}`

/**
 * Tells whether an error's message is the one of an outdated form.
 *
 * @param message - The error's message.
 * @returns Whether a reload shows the newer version.
 */
export const isStaleVersionMessage = (message: string): boolean =>
  message.endsWith(STALE_VERSION_HINT)
