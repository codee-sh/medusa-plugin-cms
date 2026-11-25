import type { RegistryArea } from "../../area/types"
import { listReachableBlocks } from "../list-reachable-blocks"

type TestBlock = { slug: string; areas: RegistryArea[] }

/**
 * Builds a block type with areas allowing the given slugs.
 *
 * @param slug - The block type's slug.
 * @param repeated - Per area, the slugs it allows.
 * @returns The block type.
 */
const buildBlock = (slug: string, ...repeated: string[][]): TestBlock => ({
  slug,
  areas: repeated.map((blocks, index) => ({
    name: `area_${index}`,
    label: `Area ${index}`,
    blocks,
  })),
})

/**
 * Builds an area allowing the given slugs.
 *
 * @param blocks - The slugs it allows.
 * @returns The area.
 */
const buildArea = (...blocks: string[]): RegistryArea => ({
  name: "sections",
  label: "Sections",
  blocks,
})

describe("listReachableBlocks", () => {
  it("lists the types the areas allow and those their types' areas allow, in the order first named", () => {
    const blocks = {
      grid: buildBlock("grid", ["grid_item"]),
      hero: buildBlock("hero"),
      grid_item: buildBlock("grid_item", ["card"]),
      card: buildBlock("card"),
    }

    expect(
      listReachableBlocks([buildArea("grid", "hero")], blocks).map(
        ({ slug }) => slug
      )
    ).toEqual(["grid", "hero", "grid_item", "card"])
  })

  it("lists a type inside itself once", () => {
    const blocks = {
      grid: buildBlock("grid", ["grid_item"]),
      grid_item: buildBlock("grid_item", ["grid"]),
    }

    expect(
      listReachableBlocks([buildArea("grid"), buildArea("grid")], blocks).map(
        ({ slug }) => slug
      )
    ).toEqual(["grid", "grid_item"])
  })

  it("leaves out a type nothing reaches and a slug that is no type", () => {
    const blocks = { hero: buildBlock("hero"), card: buildBlock("card") }

    expect(listReachableBlocks([buildArea("hero", "nope")], blocks)).toEqual([
      blocks.hero,
    ])
  })
})
