import { buildTestConfig } from "../../__tests__/fixtures"
import { prepareRegistry } from "../../registry/prepare-registry"
import { buildReadPlacement } from "../build-read-placement"
import { listMediaSlots } from "../list-media-slots"

const registry = prepareRegistry(buildTestConfig())
const placement = buildReadPlacement(registry, registry.collections.recipe)

describe("listMediaSlots", () => {
  it("lists the document's media fields, then its blocks' at any depth, each with its path and values", () => {
    const document = {
      cover: "cover.jpg",
      gallery: ["b.png", "a.pdf"],
      sections: [
        {
          block_type: "step",
          heading: "Cut",
          tips: [{ block_type: "step", tips: [] }],
        },
        { block_type: "callout", image: "callout.jpg" },
      ],
    }

    expect(
      listMediaSlots(document, placement).map(({ field, path, values }) => ({
        name: field.name,
        path,
        values,
      }))
    ).toEqual([
      { name: "cover", path: "cover", values: ["cover.jpg"] },
      { name: "gallery", path: "gallery", values: ["b.png", "a.pdf"] },
      { name: "image", path: "sections.1.image", values: ["callout.jpg"] },
    ])
  })

  it("lists no values for empty fields and values that are not texts, and no blocks outside an array", () => {
    expect(
      listMediaSlots(
        { cover: null, gallery: [7, "", "a.png"], sections: "x" },
        placement
      ).map(({ path, values }) => ({ path, values }))
    ).toEqual([
      { path: "cover", values: [] },
      { path: "gallery", values: ["a.png"] },
    ])
  })
})
