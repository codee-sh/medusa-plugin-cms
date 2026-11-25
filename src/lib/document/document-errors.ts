import type { DocumentError } from "./types"

/**
 * Writes errors as the message of an `INVALID_DATA` error.
 *
 * @param errors - The errors.
 * @returns One `<path>: <message>` per line; an error without a path is its message alone.
 */
export const formatDocumentErrors = (
  errors: readonly DocumentError[]
): string =>
  errors
    .map(({ path, message }) => (path ? `${path}: ${message}` : message))
    .join("\n")

/** One line of an error message: a dot path, a colon, the message. */
const ERROR_LINE = /^([A-Za-z_]\w*(?:\.\w+)*): (.+)$/

/**
 * Reads errors back from the message of an `INVALID_DATA` or `DUPLICATE_ERROR` error, the reverse of
 * `formatDocumentErrors`, so the Admin can show each one on its field.
 *
 * @param message - The error's message: one `<path>: <message>` per line.
 * @returns One error per line; a line that does not start with a dot path, such as a database error,
 * is a general error with an empty path.
 */
export const parseDocumentErrors = (message: string): DocumentError[] =>
  message
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const match = ERROR_LINE.exec(line)

      return match
        ? { path: match[1], message: match[2] }
        : { path: "", message: line }
    })
