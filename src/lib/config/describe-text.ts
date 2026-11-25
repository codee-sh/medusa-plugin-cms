import type { ClientText } from "./types"

/**
 * Describes a prepared text as a startup error quotes it: the text, or the translation's key.
 *
 * @param text - The text.
 * @returns What the error quotes.
 */
export const describeText = (text: ClientText): string =>
  typeof text === "string" ? text : text.key
