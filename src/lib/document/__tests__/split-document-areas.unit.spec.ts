import { buildTestConfig } from "../../__tests__/fixtures"
import { prepareRegistry } from "../../registry/prepare-registry"
import { splitDocumentAreas } from "../split-document-areas"

const { recipe } = prepareRegistry(buildTestConfig()).collections

describe("splitDocumentAreas", () => {
  it("takes the areas the document holds out of its values", () => {
    const sections = [{ block_type: "step", heading: "Chop" }]

    expect(splitDocumentAreas(recipe, { title: "Soup", sections })).toEqual({
      values: { title: "Soup" },
      areas: { sections },
    })
  })

  it("leaves an area the document does not hold out of the areas", () => {
    expect(splitDocumentAreas(recipe, { title: "Soup" })).toEqual({
      values: { title: "Soup" },
      areas: {},
    })
  })
})
