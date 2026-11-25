import { buildTestConfig } from "../../__tests__/fixtures"
import { prepareRegistry } from "../../registry/prepare-registry"
import { findMissingRelations } from "../find-missing-relations"

const { fields } = prepareRegistry(buildTestConfig()).collections.settings

describe("findMissingRelations", () => {
  it("finds an id that names no live document, at its field", () => {
    expect(
      findMissingRelations(
        fields,
        { featured_recipe_id: "trec_gone" },
        { featured_recipe_id: [] }
      )
    ).toEqual([
      {
        path: "featured_recipe_id",
        message: 'The document "trec_gone" was not found',
      },
    ])
  })

  it("passes an id a live document holds, and a field left out or empty", () => {
    expect(
      findMissingRelations(
        fields,
        { featured_recipe_id: "trec_1" },
        { featured_recipe_id: ["trec_1"] }
      )
    ).toEqual([])
    expect(findMissingRelations(fields, { title: "Home" }, {})).toEqual([])
    expect(
      findMissingRelations(fields, { featured_recipe_id: null }, {})
    ).toEqual([])
  })
})
