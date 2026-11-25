import { buildTestConfig } from "../../__tests__/fixtures"
import { prepareRegistry } from "../../registry/prepare-registry"
import { buildReadPlacement } from "../build-read-placement"

const registry = prepareRegistry(buildTestConfig())

describe("buildReadPlacement", () => {
  it("lists the collection's media fields, its areas, and every block type they reach with its media fields", () => {
    const placement = buildReadPlacement(registry, registry.collections.recipe)

    expect(placement.mediaFields.map(({ name }) => name)).toEqual([
      "cover",
      "gallery",
    ])
    expect(placement.areas.map(({ name }) => name)).toEqual(["sections"])
    expect(
      placement.blocks.map(({ slug, areas, mediaFields: fields }) => ({
        slug,
        areas: areas.map(({ name }) => name),
        fields: fields.map(({ name }) => name),
      }))
    ).toEqual([
      { slug: "step", areas: ["tips"], fields: [] },
      { slug: "callout", areas: [], fields: ["image"] },
      { slug: "tip", areas: [], fields: [] },
    ])
  })

  it("lists the rich text fields of the collection and of each block type apart from the media fields", () => {
    const placement = buildReadPlacement(registry, registry.collections.recipe)

    expect(placement.richTextFields.map(({ name }) => name)).toEqual([
      "summary",
    ])
    expect(
      placement.blocks.map(({ slug, mediaFields: fields, richTextFields }) => ({
        slug,
        fields: fields.map(({ name }) => name),
        richTextFields: richTextFields.map(({ name }) => name),
      }))
    ).toEqual([
      { slug: "step", fields: [], richTextFields: [] },
      { slug: "callout", fields: ["image"], richTextFields: ["body"] },
      { slug: "tip", fields: [], richTextFields: [] },
    ])
  })

  it("holds no functions, as it travels between steps", () => {
    const placement = buildReadPlacement(registry, registry.collections.recipe)

    expect(JSON.parse(JSON.stringify(placement))).toEqual(placement)
  })
})
