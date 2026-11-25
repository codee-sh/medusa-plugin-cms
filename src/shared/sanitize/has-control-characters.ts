const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/
const CONTROL_CHARACTERS_BUT_LINE_BREAKS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

/**
 * Tells whether a text holds a control character: `U+0000` to `U+001F` or `U+007F`. PostgreSQL refuses
 * `U+0000` in a text column, and the rest have no place in content.
 *
 * @param text - The text.
 * @param options - `multiline` allows tab, line feed and carriage return, which a text of several lines
 * holds.
 * @returns Whether the text holds one.
 */
export const hasControlCharacters = (
  text: string,
  { multiline }: { multiline: boolean }
): boolean =>
  (multiline ? CONTROL_CHARACTERS_BUT_LINE_BREAKS : CONTROL_CHARACTERS).test(
    text
  )
