import type { z as zod } from "zod"
import { hasControlCharacters } from "./has-control-characters"

/** The message of a text refused for a control character. */
export const CONTROL_CHARACTERS_MESSAGE =
  "Remove the control characters from this text"

/**
 * Builds the schema of a text value: any text without a control character. The text is never changed,
 * only refused; a refused text skips the checks chained after this one, so it is reported once.
 *
 * @param z - The Zod instance of the caller, so the schema works with the server's and the Admin's.
 * @param options - `multiline` allows tab, line feed and carriage return.
 * @returns The schema.
 */
export const buildTextSchema = (
  z: typeof zod,
  { multiline }: { multiline: boolean }
): zod.ZodType<string> =>
  z.string().refine((text) => !hasControlCharacters(text, { multiline }), {
    message: CONTROL_CHARACTERS_MESSAGE,
    abort: true,
  })
