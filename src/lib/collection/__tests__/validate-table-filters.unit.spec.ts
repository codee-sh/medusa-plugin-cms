import type { CmsTableConfig, CollectionConfig } from "../../config/types"
import { validateTableFilters } from "../validate-table-filters"

/** A collection with a field of each kind the check reads; only `fields` matters to it. */
const collection = {
  slug: "recipe",
  fields: {
    title: { type: "text", label: "Title" },
    vegan: { type: "boolean", label: "Vegan" },
    difficulty: {
      type: "select",
      label: "Difficulty",
      options: [{ value: "easy", label: "Easy" }],
    },
    related_recipe_id: {
      type: "relationship",
      relationTo: "recipe",
      label: "Related",
    },
    order: { type: "boolean", label: "Ordered" },
  },
} as unknown as CollectionConfig

/**
 * Builds a table that filters by the given fields.
 *
 * @param filters - The table's filters.
 * @returns The table.
 */
const tableWith = (filters: unknown): CmsTableConfig =>
  ({ columns: [{ field: "title" }], filters }) as CmsTableConfig

/**
 * Runs the check and returns its error message.
 *
 * @param table - The table.
 * @returns The message, or an empty text when the check passed.
 */
const errorOf = (table: CmsTableConfig): string => {
  try {
    validateTableFilters(table, collection, 'collection "recipe"', "table")
    return ""
  } catch (error) {
    return (error as Error).message
  }
}

describe("validateTableFilters", () => {
  it("takes select and boolean fields, and a table without filters", () => {
    expect(errorOf(tableWith(["vegan", "difficulty"]))).toBe("")
    expect(errorOf(tableWith(undefined))).toBe("")
  })

  it.each<[string, unknown, string]>([
    ["no list", "vegan", "table filters needs a list of fields"],
    [
      "no field",
      ["nope"],
      'table filter [0] "nope" is no select or boolean field',
    ],
    [
      "a text field",
      ["title"],
      'table filter [0] "title" is no select or boolean field',
    ],
    [
      "a relationship, which waits for the picker",
      ["related_recipe_id"],
      'table filter [0] "related_recipe_id" is no select or boolean field',
    ],
    [
      "a field named after a parameter of the table",
      ["order"],
      'table filter [0] "order" shares its name with a parameter of the table',
    ],
    ["a field twice", ["vegan", "vegan"], 'table filters "vegan" twice'],
  ])("refuses %s", (_name, filters, message) => {
    expect(errorOf(tableWith(filters))).toContain(message)
  })
})
