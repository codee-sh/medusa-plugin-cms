import type { Field } from "../../field/types"
import { listStoreColumns } from "../list-store-columns"

/**
 * Builds a text field as the registry projects it.
 *
 * @param name - The field's column.
 * @param hidden - Whether the store leaves it out.
 * @returns The field.
 */
const fieldOf = (name: string, hidden?: true): Field => ({
  name,
  kind: "text",
  label: name,
  searchable: false,
  ...(hidden && { store: { hidden } }),
})

const FIELDS = [fieldOf("title"), fieldOf("notes", true), fieldOf("slug")]

describe("listStoreColumns", () => {
  it("answers the document's columns, metadata and the public fields of a model with metadata", () => {
    expect(listStoreColumns(FIELDS, true)).toEqual([
      "id",
      "published_at",
      "updated_at",
      "metadata",
      "title",
      "slug",
    ])
  })

  it("leaves metadata out for a model without it", () => {
    expect(listStoreColumns(FIELDS, false)).toEqual([
      "id",
      "published_at",
      "updated_at",
      "title",
      "slug",
    ])
  })
})
