import { buildTestConfig } from "../../../../../lib/__tests__/fixtures"
import type { ClientCollection } from "../../../../../lib/collection/types"
import { prepareRegistry } from "../../../../../lib/registry/prepare-registry"
import { sectionDocumentFields } from "../section-document-fields"

/**
 * Prepares the test recipe as the Admin receives it.
 *
 * @returns The collection.
 */
const recipeCollection = (): ClientCollection =>
  prepareRegistry(buildTestConfig()).collections
    .recipe as unknown as ClientCollection

describe("sectionDocumentFields", () => {
  it("lays the fields and areas out in their sections, by column", () => {
    const recipe = recipeCollection()
    const { main, side } = sectionDocumentFields(
      recipe,
      recipe.fields,
      recipe.areas
    )

    expect(main.map(({ key }) => key)).toEqual(["recipe", "content"])
    expect(side.map(({ key }) => key)).toEqual(["media"])
    expect(main[1].layout).toEqual([])
    expect(main[1].areas.map(({ name }) => name)).toEqual(["sections"])
    expect(side[0].layout).toEqual(["cover", "gallery"])
  })

  it("leaves out a section of nothing the form shows, such as the areas of a create form", () => {
    const recipe = recipeCollection()
    const { main } = sectionDocumentFields(recipe, recipe.fields)

    expect(main.map(({ key }) => key)).toEqual(["recipe"])
  })
})
