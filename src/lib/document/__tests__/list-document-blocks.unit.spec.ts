import type { RegistryArea } from "../../area/types"
import { listDocumentBlocks } from "../list-document-blocks"
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

describe("listDocumentBlocks", () => {
  it("lists every block three levels deep, each before its areas' blocks, with its place", () => {
    const hero = { id: "hero_1", block_type: "hero" }
    const item = { id: "item_1", block_type: "grid_item", content: [hero] }
    const grid = { id: "grid_1", block_type: "grid", items: [item] }
    const last = { block_type: "hero" }

    const listed = listDocumentBlocks(SHAPE, { sections: [grid, last] })

    expect(
      listed.map(({ block, path, area, type, parent }) => ({
        block,
        path,
        area: area.name,
        type: type?.slug,
        parent,
      }))
    ).toEqual([
      {
        block: grid,
        path: "sections.0",
        area: "sections",
        type: "grid",
        parent: null,
      },
      {
        block: item,
        path: "sections.0.items.0",
        area: "items",
        type: "grid_item",
        parent: grid,
      },
      {
        block: hero,
        path: "sections.0.items.0.content.0",
        area: "content",
        type: "hero",
        parent: item,
      },
      {
        block: last,
        path: "sections.1",
        area: "sections",
        type: "hero",
        parent: null,
      },
    ])
  })

  it("lists a block of a type the shape does not know without going into it", () => {
    const unknown = {
      id: "x_1",
      block_type: "gone",
      items: [{ id: "item_1", block_type: "grid_item" }],
    }

    expect(
      listDocumentBlocks(SHAPE, { sections: [unknown] }).map(({ path }) => path)
    ).toEqual(["sections.0"])
  })

  it("lists nothing for an area left out, a block's area left out, or an item that is not a block", () => {
    expect(listDocumentBlocks(SHAPE, {})).toEqual([])
    expect(
      listDocumentBlocks(SHAPE, {
        sections: [{ id: "grid_1", block_type: "grid" }, null, "text"],
      }).map(({ path }) => path)
    ).toEqual(["sections.0"])
  })
})
