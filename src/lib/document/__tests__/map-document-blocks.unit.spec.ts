import type { RegistryArea } from "../../area/types"
import { mapDocumentBlocks } from "../map-document-blocks"
import type { DocumentShape } from "../types"

const SECTIONS: RegistryArea = {
  name: "sections",
  label: "Sections",
  blocks: ["grid", "hero"],
}
const ITEMS: RegistryArea = {
  name: "items",
  label: "Items",
  blocks: ["grid_item"],
}
const CONTENT: RegistryArea = {
  name: "content",
  label: "Content",
  blocks: ["hero"],
}

const SHAPE: DocumentShape = {
  areas: [SECTIONS],
  blocks: [
    { slug: "grid", areas: [ITEMS] },
    { slug: "grid_item", areas: [CONTENT] },
    { slug: "hero", areas: [] },
  ],
}

const DOCUMENT = {
  id: "page_1",
  title: "Home",
  sections: [
    {
      id: "grid_1",
      block_type: "grid",
      rank: 0,
      items: [
        {
          id: "item_1",
          block_type: "grid_item",
          rank: 0,
          content: [{ id: "hero_1", block_type: "hero", rank: 0 }],
        },
      ],
    },
  ],
}

describe("mapDocumentBlocks", () => {
  it("maps every block three levels deep and copies the document's own keys", () => {
    const mapped = mapDocumentBlocks(
      SHAPE,
      DOCUMENT,
      ({ rank: _rank, ...block }) => block
    )

    expect(mapped).toEqual({
      id: "page_1",
      title: "Home",
      sections: [
        {
          id: "grid_1",
          block_type: "grid",
          items: [
            {
              id: "item_1",
              block_type: "grid_item",
              content: [{ id: "hero_1", block_type: "hero" }],
            },
          ],
        },
      ],
    })
    expect(DOCUMENT.sections[0].rank).toBe(0)
  })

  it("hands each block its areas already mapped, and its place", () => {
    const places: string[] = []

    mapDocumentBlocks(
      SHAPE,
      DOCUMENT,
      (block, { path, area, type, parent }) => {
        places.push(
          `${path} ${area.name} ${type?.slug} ${parent?.id ?? "-"} ${JSON.stringify(block.items ?? block.content ?? null)}`
        )
        return { id: block.id }
      }
    )

    expect(places).toEqual([
      "sections.0.items.0.content.0 content hero item_1 null",
      'sections.0.items.0 items grid_item grid_1 [{"id":"hero_1"}]',
      'sections.0 sections grid - [{"id":"item_1"}]',
    ])
  })

  it("leaves out a block mapped to null, with everything it held", () => {
    const mapped = mapDocumentBlocks(SHAPE, DOCUMENT, (block) =>
      block.block_type === "grid_item" ? null : block
    )

    expect((mapped.sections as Record<string, unknown>[])[0].items).toEqual([])
  })

  it("copies an area left out as it is, and an item that is not a block", () => {
    expect(mapDocumentBlocks(SHAPE, { title: "Home" }, () => null)).toEqual({
      title: "Home",
    })
    expect(mapDocumentBlocks(SHAPE, { sections: [null] }, () => null)).toEqual({
      sections: [null],
    })
  })
})
