import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { ClientCollection } from "../../../../lib/collection/types"
import { prepareRegistry } from "../../../../lib/registry/prepare-registry"
import { collectFormMedia } from "../collect-form-media"

const registry = prepareRegistry(buildTestConfig())
const collection = {
  ...registry.collections.recipe,
  blocks: Object.values(registry.blocks),
} as unknown as ClientCollection

/**
 * Builds a record the File Module would answer for a key.
 *
 * @param id - The file's key.
 * @returns The record.
 */
const fileOf = (id: string) => ({ id, url: `http://localhost/static/${id}` })

describe("collectFormMedia", () => {
  it("lists the records the read holds in the document's and its blocks' media fields", () => {
    expect(
      collectFormMedia(collection, {
        title: "Soup",
        cover: fileOf("cover.png"),
        gallery: [fileOf("a.png"), null],
        sections: [
          { block_type: "step", heading: "Cut" },
          { block_type: "callout", image: fileOf("callout.png") },
        ],
      })
    ).toEqual([fileOf("cover.png"), fileOf("a.png"), fileOf("callout.png")])
  })

  it("lists nothing for stored values that are not records", () => {
    expect(
      collectFormMedia(collection, { cover: "cover.png", sections: [] })
    ).toEqual([])
  })
})
