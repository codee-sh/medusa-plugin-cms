import { formatEntityName } from "../format-entity-name"

describe("formatEntityName", () => {
  it("names a model of two words in snake_case", () => {
    expect(formatEntityName("TestRecipe")).toBe("test_recipe")
  })

  it("lowers a model of one word", () => {
    expect(formatEntityName("Recipe")).toBe("recipe")
  })

  it("keeps an acronym in one word, as Medusa names it", () => {
    expect(formatEntityName("CmsURLBlock")).toBe("cms_urlblock")
  })
})
