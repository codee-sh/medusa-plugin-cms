import type { RegistryField } from "../../field/types"
import { parseRichTextFields } from "../parse-rich-text-fields"

/** A rich text document of one paragraph. */
const DOCUMENT = {
  root: {
    type: "root",
    version: 1,
    children: [
      {
        type: "paragraph",
        version: 1,
        children: [{ type: "text", version: 1, text: "Warm", format: 0 }],
      },
    ],
  },
}

/**
 * Builds a `richtext` field.
 *
 * @param name - The field's name.
 * @returns The field.
 */
const richTextField = (name: string) =>
  ({ name, kind: "richtext" }) as RegistryField

describe("parseRichTextFields", () => {
  it("parses a held value's stored JSON into its document, and keeps the other keys", () => {
    expect(
      parseRichTextFields({ id: "trec_1", summary: JSON.stringify(DOCUMENT) }, [
        richTextField("summary"),
      ])
    ).toEqual({ id: "trec_1", summary: DOCUMENT })
  })

  it("leaves out a field the holder does not hold", () => {
    expect(
      parseRichTextFields({ id: "trec_1" }, [richTextField("summary")])
    ).toEqual({ id: "trec_1" })
  })
})
