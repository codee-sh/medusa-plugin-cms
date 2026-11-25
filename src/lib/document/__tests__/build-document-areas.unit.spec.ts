import { buildTestConfig } from "../../__tests__/fixtures"
import { prepareRegistry } from "../../registry/prepare-registry"
import type { Registry } from "../../registry/types"
import { buildDocumentAreas } from "../build-document-areas"

const registry = prepareRegistry(buildTestConfig())

/**
 * Builds a registry whose `sections` area allows steps only, so its callouts are stale.
 *
 * @returns The registry.
 */
const buildRegistryWithoutCallouts = (): Registry => {
  const config = buildTestConfig()
  config.collections[0].areas!.sections.blocks = ["step"]

  return prepareRegistry(config)
}

/**
 * Builds a recipe as `query.graph` reads it, with one `sections` area row.
 *
 * @param area - The area row's block rows, under their relations.
 * @returns The recipe.
 */
const buildRecipe = (area: Record<string, unknown> = {}) => ({
  id: "trec_1",
  title: "Soup",
  areas: [
    {
      id: "tsec_1",
      name: "sections",
      parent_id: null,
      recipe_id: "trec_1",
      ...area,
    },
  ],
})

/**
 * Builds the areas of a recipe of the test registry.
 *
 * @param document - The recipe as read.
 * @returns The areas.
 */
const buildRecipeAreas = (document: Record<string, unknown>) =>
  buildDocumentAreas(registry, registry.collections.recipe, document)

describe("buildDocumentAreas", () => {
  it("orders an area's blocks by rank across block types, each with its type", () => {
    const areas = buildRecipeAreas(
      buildRecipe({
        steps: [
          { id: "tstep_2", heading: "Cook", rank: 2, area_id: "tsec_1" },
          { id: "tstep_1", heading: "Chop", rank: 0, area_id: "tsec_1" },
        ],
        callouts: [{ id: "tcall_1", body: "Hot", rank: 1, area_id: "tsec_1" }],
      })
    )

    expect(areas).toEqual({
      sections: [
        {
          id: "tstep_1",
          heading: "Chop",
          rank: 0,
          area_id: "tsec_1",
          block_type: "step",
          tips: [],
        },
        {
          id: "tcall_1",
          body: "Hot",
          rank: 1,
          area_id: "tsec_1",
          block_type: "callout",
        },
        {
          id: "tstep_2",
          heading: "Cook",
          rank: 2,
          area_id: "tsec_1",
          block_type: "step",
          tips: [],
        },
      ],
    })
  })

  it("orders blocks of equal rank by id", () => {
    const areas = buildRecipeAreas(
      buildRecipe({
        steps: [{ id: "tstep_b", rank: 0 }],
        callouts: [{ id: "tcall_a", rank: 0 }],
      })
    )

    expect(areas.sections.map(({ id }) => id)).toEqual(["tcall_a", "tstep_b"])
  })

  it("serves an area without a row, or without blocks, as an empty list", () => {
    expect(buildRecipeAreas({ id: "trec_1", areas: [] })).toEqual({
      sections: [],
    })
    expect(buildRecipeAreas(buildRecipe({ steps: [], callouts: [] }))).toEqual({
      sections: [],
    })
  })

  it("reads only the document's own areas, of a configured name", () => {
    const areas = buildRecipeAreas({
      id: "trec_1",
      areas: [
        {
          id: "tsec_2",
          name: "sections",
          parent_id: "tstep_9",
          steps: [{ id: "tstep_nested", rank: 0 }],
        },
        {
          id: "tsec_3",
          name: "unknown",
          parent_id: null,
          steps: [{ id: "tstep_unknown", rank: 0 }],
        },
      ],
    })

    expect(areas).toEqual({ sections: [] })
  })

  it("ignores rows under a relation that is not a configured block type", () => {
    const areas = buildRecipeAreas(
      buildRecipe({ banners: [{ id: "tban_1", rank: 0 }] })
    )

    expect(areas).toEqual({ sections: [] })
  })

  it("marks a block whose type its area no longer allows", () => {
    const staleRegistry = buildRegistryWithoutCallouts()

    const areas = buildDocumentAreas(
      staleRegistry,
      staleRegistry.collections.recipe,
      buildRecipe({
        steps: [{ id: "tstep_1", rank: 0 }],
        callouts: [{ id: "tcall_1", body: "Hot", rank: 1 }],
      })
    )

    expect(areas.sections).toEqual([
      { id: "tstep_1", rank: 0, block_type: "step", tips: [] },
      {
        id: "tcall_1",
        body: "Hot",
        rank: 1,
        block_type: "callout",
        allowed: false,
      },
    ])
  })

  it("puts each step's tips under it, a tip and a step inside a step in rank order, down the levels", () => {
    const areas = buildRecipeAreas({
      id: "trec_1",
      areas: [
        {
          id: "tsec_1",
          name: "sections",
          parent_id: null,
          steps: [{ id: "tstep_1", rank: 0 }],
        },
        {
          id: "tsec_2",
          name: "tips",
          parent_id: "tstep_1",
          tips: [{ id: "ttip_1", text: "Sharp knife", rank: 1 }],
          steps: [{ id: "tstep_2", rank: 0 }],
        },
        {
          id: "tsec_3",
          name: "tips",
          parent_id: "tstep_2",
          tips: [{ id: "ttip_2", text: "Low heat", rank: 0 }],
        },
      ],
    })

    expect(areas.sections).toEqual([
      {
        id: "tstep_1",
        rank: 0,
        block_type: "step",
        tips: [
          {
            id: "tstep_2",
            rank: 0,
            block_type: "step",
            tips: [
              { id: "ttip_2", text: "Low heat", rank: 0, block_type: "tip" },
            ],
          },
          { id: "ttip_1", text: "Sharp knife", rank: 1, block_type: "tip" },
        ],
      },
    ])
  })

  it("keeps two steps' tips apart, though their areas share a name", () => {
    const areas = buildRecipeAreas({
      id: "trec_1",
      areas: [
        {
          id: "tsec_1",
          name: "sections",
          parent_id: null,
          steps: [
            { id: "tstep_1", rank: 0 },
            { id: "tstep_2", rank: 1 },
          ],
        },
        {
          id: "tsec_2",
          name: "tips",
          parent_id: "tstep_2",
          tips: [{ id: "ttip_1", rank: 0 }],
        },
      ],
    })

    expect(areas.sections.map(({ tips }) => tips)).toEqual([
      [],
      [{ id: "ttip_1", rank: 0, block_type: "tip" }],
    ])
  })

  it("marks a block its area no longer allows", () => {
    const config = buildTestConfig()
    config.blocks![0].areas!.tips.blocks = ["tip"]
    const narrowed = prepareRegistry(config)

    const areas = buildDocumentAreas(narrowed, narrowed.collections.recipe, {
      id: "trec_1",
      areas: [
        {
          id: "tsec_1",
          name: "sections",
          parent_id: null,
          steps: [{ id: "tstep_1", rank: 0 }],
        },
        {
          id: "tsec_2",
          name: "tips",
          parent_id: "tstep_1",
          steps: [{ id: "tstep_2", rank: 0 }],
        },
      ],
    })

    expect(areas.sections[0].tips).toEqual([
      { id: "tstep_2", rank: 0, block_type: "step", tips: [], allowed: false },
    ])
  })

  it("reads no area past maxDepth", () => {
    const config = buildTestConfig()
    config.maxDepth = 1
    const shallow = prepareRegistry(config)

    const areas = buildDocumentAreas(shallow, shallow.collections.recipe, {
      id: "trec_1",
      areas: [
        {
          id: "tsec_1",
          name: "sections",
          parent_id: null,
          steps: [{ id: "tstep_1", rank: 0 }],
        },
        {
          id: "tsec_2",
          name: "tips",
          parent_id: "tstep_1",
          tips: [{ id: "ttip_1", rank: 0 }],
        },
      ],
    })

    expect(areas.sections).toEqual([
      { id: "tstep_1", rank: 0, block_type: "step" },
    ])
  })
})
