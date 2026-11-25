import { buildTestConfig } from "../../__tests__/fixtures"
import { prepareRegistry } from "../../registry/prepare-registry"
import { buildStoreSelection } from "../build-store-selection"

const registry = prepareRegistry(buildTestConfig())
const collection = registry.collections.recipe

/**
 * Builds what the store answers of a recipe.
 *
 * @param fields - The fields Medusa resolved.
 * @returns The selection.
 */
const select = (fields: string[]) =>
  buildStoreSelection(registry, collection, fields)

/** A whole step at the last level the test config nests: its heading, and no areas. */
const STEP_AT_DEPTH = { fields: ["heading"], areas: {} }

describe("buildStoreSelection", () => {
  it("takes the document's public columns, id always", () => {
    expect(select(["title", "metadata", "published_at"])).toEqual({
      columns: ["id", "title", "metadata", "published_at"],
      areas: {},
      paths: [],
    })
  })

  it("selects a block field, and a field inside a block's area", () => {
    expect(
      select(["sections.step.heading", "sections.step.tips.tip.text"]).areas
    ).toEqual({
      sections: {
        step: {
          fields: ["heading"],
          areas: {
            tips: { tip: { fields: ["text"], areas: {} } },
          },
        },
      },
    })
  })

  it("selects a block type whole, as Medusa resolves sections.callout.*", () => {
    expect(select(["sections.callout.*"]).areas).toEqual({
      sections: {
        callout: { fields: ["body", "image"], areas: {} },
      },
    })
  })

  it("selects an area whole, every type it allows with its areas down to maxDepth", () => {
    const sections = select(["sections.*"]).areas.sections

    expect(Object.keys(sections)).toEqual(["step", "callout"])
    expect(sections.step.areas.tips.tip).toEqual({
      fields: ["text"],
      areas: {},
    })

    // Levels 1 to 4: steps in tips in steps, the fourth without areas.
    let step = sections.step
    for (let level = 1; level < registry.maxDepth; level++) {
      step = step.areas.tips.step
    }
    expect(step).toEqual(STEP_AT_DEPTH)
  })

  it("leaves out a hidden column and a path the area does not allow", () => {
    expect(select(["notes", "sections.heading", "sections.tip.text"])).toEqual({
      columns: ["id"],
      areas: { sections: {} },
      paths: [],
    })
  })

  it("hands on any other path as it is", () => {
    expect(select(["campaign", "campaign.title", "campaign.*"]).paths).toEqual([
      "campaign",
      "campaign.title",
      "campaign.*",
    ])
  })

  it("takes no metadata column for a model without one, and hands it on as any other path", () => {
    expect(
      buildStoreSelection(registry, registry.collections.tag, [
        "name",
        "metadata",
      ])
    ).toEqual({
      columns: ["id", "name"],
      areas: {},
      paths: ["metadata"],
    })
  })
})
