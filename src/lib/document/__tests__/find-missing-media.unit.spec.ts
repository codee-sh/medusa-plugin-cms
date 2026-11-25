import { buildTestConfig } from "../../__tests__/fixtures"
import { prepareRegistry } from "../../registry/prepare-registry"
import { buildReadPlacement } from "../build-read-placement"
import { findMissingMedia } from "../find-missing-media"
import type { MediaRead } from "../types"

const registry = prepareRegistry(buildTestConfig())

/**
 * Builds a record the File Module would answer for a key.
 *
 * @param id - The file's key.
 * @returns The record.
 */
const fileOf = (id: string) => ({ id, url: `http://localhost/static/${id}` })

const read: MediaRead = {
  placement: buildReadPlacement(registry, registry.collections.recipe),
  records: {
    id: ["cover.jpg", "a.pdf", "b.png"].map(fileOf),
    url: [],
  },
}

describe("findMissingMedia", () => {
  it("names each field holding a value without a record, at its path", () => {
    expect(
      findMissingMedia(
        {
          cover: "cover.jpg",
          gallery: ["b.png", "a.pdf", "gone.png"],
          sections: [{ block_type: "callout", image: "lost.jpg" }],
        },
        read
      )
    ).toEqual([
      { path: "gallery", message: 'The file "gone.png" was not found' },
      {
        path: "sections.0.image",
        message: 'The file "lost.jpg" was not found',
      },
    ])
  })

  it("finds nothing when every value has a record", () => {
    expect(
      findMissingMedia({ cover: "cover.jpg", gallery: ["a.pdf"] }, read)
    ).toEqual([])
  })
})
