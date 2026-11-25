import { buildTestConfig } from "../../__tests__/fixtures"
import type { MediaRead } from "../types"
import { prepareRegistry } from "../../registry/prepare-registry"
import { buildReadDocument } from "../build-read-document"
import { buildReadPlacement } from "../build-read-placement"
import { buildStoreDocument } from "../build-store-document"
import { buildStoreSelection } from "../build-store-selection"

const registry = prepareRegistry(buildTestConfig())
const collection = registry.collections.recipe

/**
 * Builds what the store answers of a recipe from the fields Medusa resolved.
 *
 * @param fields - The resolved fields.
 * @returns The selection.
 */
const select = (fields: string[]) =>
  buildStoreSelection(registry, collection, fields)

/** Every public column of a recipe and its whole area, as a single document's defaults resolve. */
const WHOLE = select(
  collection.storeQuery.retrieve.config.defaults!.map(String)
)

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
    id: ["cover.jpg", "a.png", "b.png", "callout.jpg"].map(fileOf),
    url: [],
  },
}

/** System columns a row read through Query holds. */
const SYSTEM = {
  created_at: "2026-11-18T09:00:00.000Z",
  updated_at: "2026-11-18T10:00:00.000Z",
  deleted_at: null,
}

/** A published recipe as `get-cms-document` reads it, with a step holding a tip and a callout. */
const recipe = {
  id: "trec_1",
  title: "Soup",
  slug: "soup",
  status: "published",
  published_at: "2026-11-18T10:00:00.000Z",
  created_by: "user_1",
  updated_by: "user_2",
  notes: "Season to taste",
  cover: "cover.jpg",
  gallery: ["b.png", "gone.png", "a.png"],
  summary: JSON.stringify(richTextOf("Warm")),
  metadata: null,
  ...SYSTEM,
  areas: [{ id: "tsec_1", name: "sections", parent_id: null }],
  sections: [
    {
      id: "tstep_1",
      block_type: "step",
      heading: "Cut",
      rank: 0,
      area_id: "tsec_1",
      ...SYSTEM,
      tips: [
        {
          id: "ttip_1",
          block_type: "tip",
          text: "Sharp",
          rank: 0,
          area_id: "tsec_2",
          ...SYSTEM,
        },
      ],
    },
    {
      id: "tcall_1",
      block_type: "callout",
      body: JSON.stringify(richTextOf("Hot")),
      image: "callout.jpg",
      rank: 1,
      area_id: "tsec_1",
      ...SYSTEM,
    },
  ],
}

describe("buildStoreDocument", () => {
  it("answers the public columns and every block in order, at any depth, without the CMS's own", () => {
    expect(buildStoreDocument(buildReadDocument(recipe, media), WHOLE)).toEqual(
      {
        id: "trec_1",
        title: "Soup",
        slug: "soup",
        published_at: "2026-11-18T10:00:00.000Z",
        updated_at: "2026-11-18T10:00:00.000Z",
        cover: fileOf("cover.jpg"),
        gallery: [fileOf("b.png"), fileOf("a.png")],
        summary: richTextOf("Warm"),
        metadata: null,
        sections: [
          {
            id: "tstep_1",
            block_type: "step",
            heading: "Cut",
            tips: [{ id: "ttip_1", block_type: "tip", text: "Sharp" }],
          },
          {
            id: "tcall_1",
            block_type: "callout",
            body: richTextOf("Hot"),
            image: fileOf("callout.jpg"),
          },
        ],
      }
    )
  })

  it("answers only the columns selected, id always", () => {
    expect(
      buildStoreDocument(buildReadDocument(recipe, media), select(["title"]))
    ).toEqual({
      id: "trec_1",
      title: "Soup",
    })
  })

  it("answers only the block types and fields selected, through areas", () => {
    expect(
      buildStoreDocument(
        buildReadDocument(recipe, media),
        select(["sections.step.heading", "sections.step.tips.tip.text"])
      ).sections
    ).toEqual([
      {
        id: "tstep_1",
        block_type: "step",
        heading: "Cut",
        tips: [{ id: "ttip_1", block_type: "tip", text: "Sharp" }],
      },
    ])
    expect(
      buildStoreDocument(
        buildReadDocument(recipe, media),
        select(["sections.callout.image"])
      ).sections
    ).toEqual([
      { id: "tcall_1", block_type: "callout", image: fileOf("callout.jpg") },
    ])
  })

  it("never answers a hidden field, even when the fields name it", () => {
    expect(
      buildStoreDocument(
        buildReadDocument(recipe, media),
        select(["title", "notes"])
      )
    ).toEqual({ id: "trec_1", title: "Soup" })
  })

  it("hands on a path that is no column or area, such as a project's own link", () => {
    expect(
      buildStoreDocument(
        buildReadDocument(
          { ...recipe, campaign: { id: "camp_1", title: "Spring" } },
          media
        ),
        select(["campaign.title"])
      )
    ).toEqual({ id: "trec_1", campaign: { id: "camp_1", title: "Spring" } })
  })

  it.each([
    ["an empty object", {}],
    ["undefined", undefined],
  ])("answers metadata as null when it is %s", (_label, metadata) => {
    expect(
      buildStoreDocument(
        buildReadDocument({ ...recipe, metadata }, media),
        WHOLE
      ).metadata
    ).toBe(null)
  })

  it("answers filled metadata whole", () => {
    const metadata = { theme: "dark", order: { top: 1 } }

    expect(
      buildStoreDocument(
        buildReadDocument({ ...recipe, metadata }, media),
        WHOLE
      ).metadata
    ).toEqual(metadata)
  })

  it("adds no metadata to a model without the column", () => {
    const { metadata: _metadata, ...withoutMetadata } = recipe

    expect(
      buildStoreDocument(buildReadDocument(withoutMetadata, media), WHOLE)
    ).not.toHaveProperty("metadata")
  })

  it("leaves out a block its area no longer allows, with its areas", () => {
    const document = buildStoreDocument(
      buildReadDocument(
        {
          ...recipe,
          sections: [
            { ...recipe.sections[0], allowed: false },
            recipe.sections[1],
          ],
        },
        media
      ),
      WHOLE
    )

    expect(document.sections).toEqual([
      expect.objectContaining({ id: "tcall_1" }),
    ])
  })

  it("leaves the document it is given untouched", () => {
    buildStoreDocument(buildReadDocument(recipe, media), WHOLE)

    expect(recipe).toMatchObject({ status: "published", cover: "cover.jpg" })
    expect(recipe.sections[0]).toMatchObject({ rank: 0, area_id: "tsec_1" })
  })
})
