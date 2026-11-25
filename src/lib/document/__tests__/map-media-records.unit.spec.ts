import { buildTestConfig } from "../../__tests__/fixtures"
import { prepareRegistry } from "../../registry/prepare-registry"
import { buildReadPlacement } from "../build-read-placement"
import { mapMediaRecords } from "../map-media-records"
import type { MediaRead } from "../types"

const registry = prepareRegistry(buildTestConfig())

/**
 * Builds a record the File Module would answer for a key.
 *
 * @param id - The file's key.
 * @returns The record.
 */
const fileOf = (id: string) => ({ id, url: `http://localhost/static/${id}` })

/** A recipe with a cover, a gallery, and a callout with an image among its sections. */
const recipe = {
  title: "Soup",
  cover: "cover.jpg",
  gallery: ["b.png", "a.pdf", "gone.png"],
  sections: [
    { id: "tstep_1", block_type: "step", heading: "Cut" },
    { id: "tcall_1", block_type: "callout", image: "callout.jpg" },
  ],
}

const read: MediaRead = {
  placement: buildReadPlacement(registry, registry.collections.recipe),
  records: {
    id: ["cover.jpg", "a.pdf", "b.png", "callout.jpg"].map(fileOf),
    url: [],
  },
}

describe("mapMediaRecords", () => {
  it("puts each record in place of its value, a list in its stored order without the missing", () => {
    const placed = mapMediaRecords(recipe, read)

    expect(placed.cover).toEqual(fileOf("cover.jpg"))
    expect(placed.gallery).toEqual([fileOf("b.png"), fileOf("a.pdf")])
    expect((placed.sections as Record<string, unknown>[])[1].image).toEqual(
      fileOf("callout.jpg")
    )
  })

  it("answers null for one file not found, and keeps an empty field as it is", () => {
    const placed = mapMediaRecords({ cover: "gone.jpg", gallery: null }, read)

    expect(placed.cover).toBeNull()
    expect(placed.gallery).toBeNull()
  })

  it("leaves the document it is given untouched", () => {
    mapMediaRecords(recipe, read)

    expect(recipe.cover).toBe("cover.jpg")
    expect(recipe.sections[1]).toMatchObject({ image: "callout.jpg" })
  })
})
