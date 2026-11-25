import { parseRichText } from "../../shared/rich-text/parse-rich-text"
import type { RegistryField } from "../field/types"

/**
 * Parses the `richtext` values a document or a block holds, leaving out a field it does not hold.
 *
 * @param holder - The document or the block.
 * @param fields - Its `richtext` fields.
 * @returns A copy with each value a document, or `null`, and every other key as it was.
 */
export const parseRichTextFields = (
  holder: Record<string, unknown>,
  fields: RegistryField[]
): Record<string, unknown> => ({
  ...holder,
  ...Object.fromEntries(
    fields
      .filter(({ name }) => name in holder)
      .map(({ name }) => [name, parseRichText(holder[name])])
  ),
})
