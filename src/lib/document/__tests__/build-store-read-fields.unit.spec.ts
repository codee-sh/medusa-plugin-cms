import { buildTestConfig } from "../../__tests__/fixtures"
import { prepareRegistry } from "../../registry/prepare-registry"
import { buildStoreReadFields } from "../build-store-read-fields"
import { buildStoreSelection } from "../build-store-selection"

const registry = prepareRegistry(buildTestConfig())

/**
 * Builds the fields Query reads for what the store answers of a recipe.
 *
 * @param fields - The fields Medusa resolved.
 * @returns The fields, sorted.
 */
const readFieldsOf = (fields: string[]) =>
  buildStoreReadFields(
    registry,
    buildStoreSelection(registry, registry.collections.recipe, fields)
  ).sort()

describe("buildStoreReadFields", () => {
  it("reads only the columns selected and the paths handed on, without areas", () => {
    expect(readFieldsOf(["title", "campaign.title"])).toEqual([
      "campaign.title",
      "id",
      "title",
    ])
  })

  it("reads the area rows and, of each selected block type, only its selected columns and its place", () => {
    expect(
      readFieldsOf(["sections.step.heading", "sections.step.tips.tip.text"])
    ).toEqual([
      "areas.id",
      "areas.name",
      "areas.parent_id",
      "areas.steps.area_id",
      "areas.steps.heading",
      "areas.steps.id",
      "areas.steps.rank",
      "areas.tips.area_id",
      "areas.tips.id",
      "areas.tips.rank",
      "areas.tips.text",
      "id",
    ])
  })

  it("does not read a block type no path names", () => {
    expect(readFieldsOf(["sections.callout.image"])).not.toContain(
      "areas.steps.id"
    )
  })
})
