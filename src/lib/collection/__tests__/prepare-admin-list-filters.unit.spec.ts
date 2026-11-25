import type { Field, FieldKind } from "../../field/types"
import { prepareAdminListFilters } from "../prepare-admin-list-filters"

/**
 * Builds a field as the registry projects it.
 *
 * @param name - The field's column.
 * @param kind - The field's kind.
 * @returns The field.
 */
const fieldOf = (name: string, kind: FieldKind): Field => ({
  name,
  kind,
  label: name,
  searchable: false,
})

/** A collection's fields, one of each kind the schema reads and one it leaves out. */
const schema = prepareAdminListFilters([
  fieldOf("title", "text"),
  fieldOf("difficulty", "select"),
  fieldOf("related_recipe_id", "relationship"),
  fieldOf("vegan", "boolean"),
])

describe("prepareAdminListFilters", () => {
  it("reads a select's and a relationship's values as lists, and a boolean as a boolean", () => {
    expect(
      schema.parse({
        difficulty: "easy",
        related_recipe_id: ["rec_1", "rec_2"],
        vegan: "true",
      })
    ).toEqual({
      difficulty: ["easy"],
      related_recipe_id: ["rec_1", "rec_2"],
      vegan: true,
    })
  })

  it("takes no filters at all", () => {
    expect(schema.parse(undefined)).toBeUndefined()
    expect(schema.parse({})).toEqual({})
  })

  it.each<[string, Record<string, unknown>]>([
    ["a field of another kind", { title: "Soup" }],
    ["a field the collection does not have", { nope: "easy" }],
    ["an empty value", { difficulty: "" }],
    ["an empty list", { difficulty: [] }],
    ["a boolean that is no boolean", { vegan: "maybe" }],
  ])("refuses %s", (_name, filters) => {
    expect(schema.safeParse(filters).success).toBe(false)
  })
})
