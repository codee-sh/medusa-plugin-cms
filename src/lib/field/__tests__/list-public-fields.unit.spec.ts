import type { Field } from "../types"
import { listPublicFields } from "../list-public-fields"

/**
 * Builds a text field as the registry projects it.
 *
 * @param name - The field's column.
 * @param store - The field's `store` config, if any.
 * @returns The field.
 */
const fieldOf = (name: string, store?: Field["store"]): Field => ({
  name,
  kind: "text",
  label: name,
  searchable: false,
  ...(store && { store }),
})

describe("listPublicFields", () => {
  it("keeps the fields the store may answer, in their order, and leaves out a hidden one", () => {
    expect(
      listPublicFields([
        fieldOf("title"),
        fieldOf("notes", { hidden: true }),
        fieldOf("vegan", { filterable: true }),
        fieldOf("slug"),
      ])
    ).toEqual(["title", "vegan", "slug"])
  })

  it("answers an empty list for no fields", () => {
    expect(listPublicFields([])).toEqual([])
  })
})
