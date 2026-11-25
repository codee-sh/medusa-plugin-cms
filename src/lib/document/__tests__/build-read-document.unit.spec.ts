import { buildTestConfig } from "../../__tests__/fixtures"
import type { MediaRead } from "../types"
import { prepareRegistry } from "../../registry/prepare-registry"
import { buildReadDocument } from "../build-read-document"
import { buildReadPlacement } from "../build-read-placement"

const registry = prepareRegistry(buildTestConfig())

/**
 * Builds a record the File Module would answer for a key.
 *
 * @param id - The file's key.
 * @returns The record.
 */
const fileOf = (id: string) => ({ id, url: `http://localhost/static/${id}` })

/**
 * Builds a rich text document of one paragraph.
 *
 * @param text - The paragraph's text.
 * @returns The document.
 */
const richTextOf = (text: string) => ({
  root: {
    type: "root",
    version: 1,
    children: [
      {
        type: "paragraph",
        version: 1,
        children: [{ type: "text", version: 1, text, format: 0 }],
      },
    ],
  },
})

const media: MediaRead = {
  placement: buildReadPlacement(registry, registry.collections.recipe),
  records: {
    id: ["cover.jpg", "a.png", "callout.jpg"].map(fileOf),
    url: [],
  },
}

/** A recipe as a read finds it, with a callout holding an image and rich text. */
const recipe = {
  id: "trec_1",
  title: "Soup",
  cover: "cover.jpg",
  gallery: ["gone.png", "a.png"],
  summary: JSON.stringify(richTextOf("Warm")),
  sections: [
    {
      id: "tcall_1",
      block_type: "callout",
      body: JSON.stringify(richTextOf("Hot")),
      image: "callout.jpg",
    },
  ],
}

describe("buildReadDocument", () => {
  it("places the media records and the rich text documents of a document and of its blocks", () => {
    expect(buildReadDocument(recipe, media)).toEqual({
      id: "trec_1",
      title: "Soup",
      cover: fileOf("cover.jpg"),
      gallery: [fileOf("a.png")],
      summary: richTextOf("Warm"),
      sections: [
        {
          id: "tcall_1",
          block_type: "callout",
          body: richTextOf("Hot"),
          image: fileOf("callout.jpg"),
        },
      ],
    })
  })

  it("answers null for one file not found", () => {
    expect(
      buildReadDocument({ ...recipe, cover: "gone.jpg" }, media).cover
    ).toBeNull()
  })

  it("leaves the document it is given untouched", () => {
    buildReadDocument(recipe, media)

    expect(recipe).toMatchObject({
      cover: "cover.jpg",
      summary: JSON.stringify(richTextOf("Warm")),
    })
    expect(recipe.sections[0]).toMatchObject({ image: "callout.jpg" })
  })
})
