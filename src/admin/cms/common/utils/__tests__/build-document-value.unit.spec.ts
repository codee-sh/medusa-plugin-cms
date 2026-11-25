import type { ClientCollection } from "../../../../../lib/collection/types"
import { buildDocumentValue } from "../build-document-value"

/** A collection of two fields and one area, whose area takes a hero block. */
const collection = {
  fields: [{ name: "title" }, { name: "slug" }],
  areas: [{ name: "sections" }],
  blocks: [{ slug: "hero", fields: [{ name: "title" }, { name: "cta_href" }] }],
} as unknown as ClientCollection

describe("buildDocumentValue", () => {
  it("picks the document's fields and maps each area's rows to blocks", () => {
    expect(
      buildDocumentValue(collection, {
        title: "Summer offer",
        slug: "summer",
        sections: [
          {
            id: "blk_1",
            block_type: "hero",
            title: "Sale",
            cta_href: "/offer",
          },
        ],
      })
    ).toEqual({
      fields: { title: "Summer offer", slug: "summer" },
      areas: {
        sections: [
          {
            type: "hero",
            fields: { title: "Sale", cta_href: "/offer" },
            areas: {},
          },
        ],
      },
    })
  })

  it("leaves out the fields the form does not hold, as the create form shows some only", () => {
    expect(buildDocumentValue(collection, { title: "Draft" })).toEqual({
      fields: { title: "Draft" },
      areas: { sections: [] },
    })
  })

  it("gives a block of a type the collection does not know no fields", () => {
    expect(
      buildDocumentValue(collection, {
        sections: [{ block_type: "gone", title: "Old" }],
      }).areas.sections
    ).toEqual([{ type: "gone", fields: {}, areas: {} }])
  })
})
