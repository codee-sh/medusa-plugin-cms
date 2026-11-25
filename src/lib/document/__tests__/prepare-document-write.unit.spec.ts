import { buildTestConfig } from "../../__tests__/fixtures"
import type { LayoutSectionConfig } from "../../config/types"
import { prepareRegistry } from "../../registry/prepare-registry"
import type { Registry } from "../../registry/types"
import { buildDocumentAreas } from "../build-document-areas"
import { prepareDocumentWrite } from "../prepare-document-write"
import type { DocumentSubmission, SubmittedBlock } from "../types"

const registry = prepareRegistry(buildTestConfig())

/**
 * Builds a rich text document of one paragraph, as a callout's body holds it.
 *
 * @param text - The paragraph's text.
 * @returns The document.
 */
const buildRichText = (text: string) => ({
  root: {
    type: "root",
    children: [{ type: "paragraph", children: [{ type: "text", text }] }],
  },
})

const HOT = buildRichText("Hot")
const HOT_JSON = JSON.stringify(HOT)
const TIP = buildRichText("Tip")
const TIP_JSON = JSON.stringify(TIP)

/**
 * Builds a registry whose recipes also have an `aside` area of callouts.
 *
 * @returns The registry.
 */
const buildRegistryWithAside = (): Registry => {
  const config = buildTestConfig()
  config.collections[0].areas!.aside = { label: "Aside", blocks: ["callout"] }
  ;(
    config.collections[0].admin.sections.find(
      ({ key }) => key === "content"
    ) as LayoutSectionConfig
  ).areas!.push("aside")

  return prepareRegistry(config)
}

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
 * Builds the stored recipe `trec_1` as `get-cms-document` returns it.
 *
 * @param areaRows - The area rows, with their block rows under their relations.
 * @param fromRegistry - The registry the read resolves areas with.
 * @returns The recipe, with its area rows under `areas` and its areas under their names.
 */
const buildStored = (
  areaRows: Record<string, unknown>[] = [
    {
      id: "tsec_1",
      name: "sections",
      parent_id: null,
      recipe_id: "trec_1",
      steps: [
        { id: "tstep_1", heading: "Chop", rank: 0, area_id: "tsec_1" },
        { id: "tstep_2", heading: "Cook", rank: 2, area_id: "tsec_1" },
      ],
      callouts: [{ id: "tcall_1", body: HOT_JSON, rank: 1, area_id: "tsec_1" }],
    },
  ],
  fromRegistry: Registry = registry
): Record<string, unknown> => {
  const document = { id: "trec_1", title: "Soup", areas: areaRows }

  return {
    ...document,
    ...buildDocumentAreas(
      fromRegistry,
      fromRegistry.collections.recipe,
      document
    ),
  }
}

/**
 * Builds an edit of `trec_1` by `user_2`.
 *
 * @param areas - The areas the body holds.
 * @returns The submission.
 */
const buildEdit = (
  areas?: Record<string, SubmittedBlock[]>
): DocumentSubmission => ({
  values: { title: "Broth" },
  updated_by: "user_2",
  areas,
})

/**
 * Plans a save of `trec_1`.
 *
 * @param stored - The stored recipe, or nothing for a new one.
 * @param submitted - What the save submits.
 * @param fromRegistry - The registry to plan with.
 * @returns The write.
 */
const planSave = (
  stored: Record<string, unknown> | undefined,
  submitted: DocumentSubmission,
  fromRegistry: Registry = registry
) =>
  prepareDocumentWrite(
    fromRegistry,
    fromRegistry.collections.recipe,
    "trec_1",
    stored,
    submitted
  )

describe("prepareDocumentWrite", () => {
  it("creates a new document's row with its values and authorship", () => {
    const write = planSave(undefined, {
      values: { title: "Soup" },
      created_by: "user_1",
      updated_by: "user_1",
    })

    expect(write).toEqual({
      create: [
        {
          key: "TestRecipe",
          rows: [
            {
              id: "trec_1",
              title: "Soup",
              created_by: "user_1",
              updated_by: "user_1",
            },
          ],
        },
      ],
      update: [],
      delete: [],
    })
  })

  it("updates an edited document's values and editor, and leaves an absent area as stored", () => {
    const write = planSave(buildStored(), buildEdit())

    expect(write).toEqual({
      create: [],
      update: [
        {
          key: "TestRecipe",
          rows: [{ id: "trec_1", title: "Broth", updated_by: "user_2" }],
        },
      ],
      delete: [],
    })
  })

  it("reorders blocks by giving the same ids new ranks, creating and deleting nothing", () => {
    const write = planSave(
      buildStored(),
      buildEdit({
        sections: [
          { id: "tstep_2", block_type: "step", heading: "Cook" },
          { id: "tcall_1", block_type: "callout", body: HOT },
          { id: "tstep_1", block_type: "step", heading: "Chop" },
        ],
      })
    )

    expect(write.create).toEqual([])
    expect(write.delete).toEqual([])
    expect(write.update).toEqual([
      {
        key: "TestRecipe",
        rows: [{ id: "trec_1", title: "Broth", updated_by: "user_2" }],
      },
      {
        key: "TestStep",
        rows: [
          { id: "tstep_2", heading: "Cook", rank: 0, area_id: "tsec_1" },
          { id: "tstep_1", heading: "Chop", rank: 2, area_id: "tsec_1" },
        ],
      },
      {
        key: "TestCallout",
        rows: [{ id: "tcall_1", body: HOT_JSON, rank: 1, area_id: "tsec_1" }],
      },
    ])
  })

  it("deletes a block whose type changed and creates one of the new type", () => {
    const write = planSave(
      buildStored(),
      buildEdit({
        sections: [
          { id: "tstep_1", block_type: "step", heading: "Chop" },
          { id: "tcall_1", block_type: "step", heading: "Rest" },
          { id: "tstep_2", block_type: "step", heading: "Cook" },
        ],
      })
    )

    expect(write.create).toEqual([
      {
        key: "TestStep",
        rows: [
          {
            id: expect.stringMatching(/^tstep_/),
            heading: "Rest",
            rank: 1,
            area_id: "tsec_1",
          },
        ],
      },
    ])
    expect(write.delete).toEqual([{ key: "TestCallout", ids: ["tcall_1"] }])
  })

  it("moves a block to another area of the document by updating its area", () => {
    const withAside = buildRegistryWithAside()
    const stored = buildStored(
      [
        {
          id: "tsec_1",
          name: "sections",
          parent_id: null,
          recipe_id: "trec_1",
          callouts: [
            { id: "tcall_1", body: HOT_JSON, rank: 0, area_id: "tsec_1" },
          ],
        },
        {
          id: "tsec_2",
          name: "aside",
          parent_id: null,
          recipe_id: "trec_1",
        },
      ],
      withAside
    )

    const write = planSave(
      stored,
      buildEdit({
        sections: [],
        aside: [{ id: "tcall_1", block_type: "callout", body: HOT }],
      }),
      withAside
    )

    expect(write.create).toEqual([])
    expect(write.delete).toEqual([])
    expect(write.update[1]).toEqual({
      key: "TestCallout",
      rows: [{ id: "tcall_1", body: HOT_JSON, rank: 0, area_id: "tsec_2" }],
    })
  })

  it("creates a block whose id is not stored, with a new id", () => {
    const write = planSave(
      buildStored(),
      buildEdit({
        sections: [
          { id: "tstep_1", block_type: "step", heading: "Chop" },
          { id: "tcall_1", block_type: "callout", body: HOT },
          { id: "tstep_2", block_type: "step", heading: "Cook" },
          { id: "tstep_9", block_type: "step", heading: "Serve" },
        ],
      })
    )

    expect(write.create).toEqual([
      {
        key: "TestStep",
        rows: [
          {
            id: expect.stringMatching(/^tstep_/),
            heading: "Serve",
            rank: 3,
            area_id: "tsec_1",
          },
        ],
      },
    ])
    expect(write.create[0].rows[0].id).not.toBe("tstep_9")
    expect(write.delete).toEqual([])
  })

  it("deletes a stored block the area no longer carries", () => {
    const write = planSave(
      buildStored(),
      buildEdit({
        sections: [
          { id: "tstep_1", block_type: "step", heading: "Chop" },
          { id: "tcall_1", block_type: "callout", body: HOT },
        ],
      })
    )

    expect(write.create).toEqual([])
    expect(write.delete).toEqual([{ key: "TestStep", ids: ["tstep_2"] }])
  })

  it("deletes every block of an area sent empty", () => {
    const write = planSave(buildStored(), buildEdit({ sections: [] }))

    expect(write.delete).toEqual([
      { key: "TestStep", ids: ["tstep_1", "tstep_2"] },
      { key: "TestCallout", ids: ["tcall_1"] },
    ])
  })

  it("keeps a stale block sent as its id and type, updating its rank only", () => {
    const withoutCallouts = buildRegistryWithoutCallouts()

    const write = planSave(
      buildStored(undefined, withoutCallouts),
      buildEdit({
        sections: [
          { id: "tcall_1", block_type: "callout" },
          { id: "tstep_1", block_type: "step", heading: "Chop" },
          { id: "tstep_2", block_type: "step", heading: "Cook" },
        ],
      }),
      withoutCallouts
    )

    expect(write.delete).toEqual([])
    expect(write.update).toContainEqual({
      key: "TestCallout",
      rows: [{ id: "tcall_1", rank: 0 }],
    })
  })

  it("creates a new document with blocks, parents first", () => {
    const write = planSave(undefined, {
      values: { title: "Soup" },
      created_by: "user_1",
      updated_by: "user_1",
      areas: {
        sections: [
          { block_type: "step", heading: "Chop" },
          { block_type: "callout", body: HOT },
        ],
      },
    })
    const areaId = write.create[1].rows[0].id

    expect(write.create.map(({ key }) => key)).toEqual([
      "TestRecipe",
      "TestSection",
      "TestStep",
      "TestCallout",
    ])
    expect(write.create[1].rows).toEqual([
      {
        id: expect.stringMatching(/^tsec_/),
        name: "sections",
        parent_id: null,
        recipe_id: "trec_1",
      },
    ])
    expect(write.create[2].rows).toEqual([
      {
        id: expect.stringMatching(/^tstep_/),
        heading: "Chop",
        rank: 0,
        area_id: areaId,
      },
    ])
    expect(write.create[3].rows).toEqual([
      {
        id: expect.stringMatching(/^tcall_/),
        body: HOT_JSON,
        rank: 1,
        area_id: areaId,
      },
    ])
    expect(write.update).toEqual([])
    expect(write.delete).toEqual([])
  })

  it("creates the row of an area that has none yet, before its blocks", () => {
    const withAside = buildRegistryWithAside()

    const write = planSave(
      buildStored(undefined, withAside),
      buildEdit({
        sections: [
          { block_type: "step", heading: "Plate" },
          { id: "tstep_1", block_type: "step", heading: "Chop" },
          { id: "tcall_1", block_type: "callout", body: HOT },
          { id: "tstep_2", block_type: "step", heading: "Cook" },
        ],
        aside: [{ block_type: "callout", body: TIP }],
      }),
      withAside
    )

    expect(write.create.map(({ key }) => key)).toEqual([
      "TestSection",
      "TestStep",
      "TestCallout",
    ])
    expect(write.create[0].rows).toEqual([
      {
        id: expect.stringMatching(/^tsec_/),
        name: "aside",
        parent_id: null,
        recipe_id: "trec_1",
      },
    ])
    expect(write.create[2].rows[0]).toMatchObject({
      body: TIP_JSON,
      rank: 0,
      area_id: write.create[0].rows[0].id,
    })
  })
})

/**
 * Builds the stored recipe `trec_1` with one step `tstep_1` in `sections`, holding in its `tips` a tip
 * `ttip_1` and a step `tstep_2`, which holds a tip `ttip_2` in its own `tips`.
 *
 * @returns The recipe as `get-cms-document` returns it.
 */
const buildNestedStored = (): Record<string, unknown> =>
  buildStored([
    {
      id: "tsec_1",
      name: "sections",
      parent_id: null,
      recipe_id: "trec_1",
      steps: [{ id: "tstep_1", heading: "Chop", rank: 0, area_id: "tsec_1" }],
    },
    {
      id: "tsec_2",
      name: "tips",
      parent_id: "tstep_1",
      recipe_id: "trec_1",
      tips: [{ id: "ttip_1", text: "Sharp", rank: 0, area_id: "tsec_2" }],
      steps: [{ id: "tstep_2", heading: "Halve", rank: 1, area_id: "tsec_2" }],
    },
    {
      id: "tsec_3",
      name: "tips",
      parent_id: "tstep_2",
      recipe_id: "trec_1",
      tips: [{ id: "ttip_2", text: "Slow", rank: 0, area_id: "tsec_3" }],
    },
  ])

/**
 * Finds the rows one kind of call writes to a model.
 *
 * @param calls - The calls of one kind.
 * @param key - The model's service key.
 * @returns The rows, or none.
 */
const rowsOf = (
  calls: { key: string; rows: Record<string, unknown>[] }[],
  key: string
) => calls.find((call) => call.key === key)?.rows ?? []

/**
 * Finds the ids the write soft-deletes of a model.
 *
 * @param write - The write.
 * @param key - The model's service key.
 * @returns The ids, or none.
 */
const deletedOf = (write: ReturnType<typeof planSave>, key: string) =>
  write.delete.find((call) => call.key === key)?.ids ?? []

describe("prepareDocumentWrite, on areas", () => {
  it("creates a new step's tips: the step's id first, its area's row under it, area rows before blocks", () => {
    const write = planSave(undefined, {
      values: { title: "Soup" },
      created_by: "user_1",
      updated_by: "user_1",
      areas: {
        sections: [
          {
            block_type: "step",
            heading: "Chop",
            tips: [{ block_type: "tip", text: "Sharp" }],
          },
        ],
      },
    })
    const [step] = rowsOf(write.create, "TestStep")
    const [tip] = rowsOf(write.create, "TestTip")
    const areaRows = rowsOf(write.create, "TestSection")

    expect(step).not.toHaveProperty("tips")
    expect(areaRows).toEqual([
      expect.objectContaining({ name: "sections", parent_id: null }),
      {
        id: expect.stringMatching(/^tsec_/),
        name: "tips",
        parent_id: step.id,
        recipe_id: "trec_1",
      },
    ])
    expect(tip).toEqual({
      id: expect.stringMatching(/^ttip_/),
      text: "Sharp",
      rank: 0,
      area_id: areaRows[1].id,
    })
    expect(write.create.map(({ key }) => key)).toEqual([
      "TestRecipe",
      "TestSection",
      "TestStep",
      "TestTip",
    ])
  })

  it("updates stored tips in place, two levels down, and writes no area row again", () => {
    const write = planSave(
      buildNestedStored(),
      buildEdit({
        sections: [
          {
            id: "tstep_1",
            block_type: "step",
            heading: "Chop",
            tips: [
              {
                id: "tstep_2",
                block_type: "step",
                heading: "Halve",
                tips: [{ id: "ttip_2", block_type: "tip", text: "Slower" }],
              },
              { id: "ttip_1", block_type: "tip", text: "Sharp" },
            ],
          },
        ],
      })
    )

    expect(rowsOf(write.create, "TestSection")).toEqual([])
    expect(rowsOf(write.update, "TestTip")).toEqual([
      { id: "ttip_2", text: "Slower", rank: 0, area_id: "tsec_3" },
      { id: "ttip_1", text: "Sharp", rank: 1, area_id: "tsec_2" },
    ])
    expect(write.delete).toEqual([])
  })

  it("moves a tip from the inner step's tips to the outer step's, deleting nothing", () => {
    const write = planSave(
      buildNestedStored(),
      buildEdit({
        sections: [
          {
            id: "tstep_1",
            block_type: "step",
            heading: "Chop",
            tips: [
              { id: "ttip_1", block_type: "tip", text: "Sharp" },
              { id: "ttip_2", block_type: "tip", text: "Slow" },
              { id: "tstep_2", block_type: "step", heading: "Halve", tips: [] },
            ],
          },
        ],
      })
    )

    expect(rowsOf(write.update, "TestTip")).toEqual([
      { id: "ttip_1", text: "Sharp", rank: 0, area_id: "tsec_2" },
      { id: "ttip_2", text: "Slow", rank: 1, area_id: "tsec_2" },
    ])
    expect(write.delete).toEqual([])
  })

  it("keeps two steps' areas of one name apart", () => {
    const write = planSave(
      buildNestedStored(),
      buildEdit({
        sections: [
          {
            id: "tstep_1",
            block_type: "step",
            heading: "Chop",
            tips: [{ id: "tstep_2", block_type: "step", heading: "Halve" }],
          },
          {
            block_type: "step",
            heading: "Serve",
            tips: [{ block_type: "tip", text: "Warm plates" }],
          },
        ],
      })
    )
    const newStep = rowsOf(write.create, "TestStep")[0]

    expect(rowsOf(write.create, "TestSection")).toEqual([
      expect.objectContaining({ name: "tips", parent_id: newStep.id }),
    ])
    // tstep_2 kept its tips, whose key the body left out.
    expect(deletedOf(write, "TestTip")).toEqual(["ttip_1"])
    expect(deletedOf(write, "TestSection")).toEqual([])
  })

  it("removes a step with everything its tips hold, at two levels, area rows last", () => {
    const write = planSave(buildNestedStored(), buildEdit({ sections: [] }))

    expect(write.delete).toEqual([
      { key: "TestStep", ids: ["tstep_1", "tstep_2"] },
      { key: "TestTip", ids: ["ttip_1", "ttip_2"] },
      { key: "TestSection", ids: ["tsec_2", "tsec_3"] },
    ])
  })

  it("spares a tip the body moved out of a removed step", () => {
    const write = planSave(
      buildNestedStored(),
      buildEdit({
        sections: [
          {
            id: "tstep_1",
            block_type: "step",
            heading: "Chop",
            tips: [
              { id: "ttip_1", block_type: "tip", text: "Sharp" },
              { id: "ttip_2", block_type: "tip", text: "Slow" },
            ],
          },
        ],
      })
    )

    expect(rowsOf(write.update, "TestTip")).toEqual([
      { id: "ttip_1", text: "Sharp", rank: 0, area_id: "tsec_2" },
      { id: "ttip_2", text: "Slow", rank: 1, area_id: "tsec_2" },
    ])
    expect(write.delete).toEqual([
      { key: "TestStep", ids: ["tstep_2"] },
      { key: "TestSection", ids: ["tsec_3"] },
    ])
  })

  it("deletes the tree of a step whose type changed in place", () => {
    const write = planSave(
      buildNestedStored(),
      buildEdit({
        sections: [{ id: "tstep_1", block_type: "callout", body: HOT }],
      })
    )

    expect(rowsOf(write.create, "TestCallout")).toHaveLength(1)
    expect(deletedOf(write, "TestStep")).toEqual(["tstep_1", "tstep_2"])
    expect(deletedOf(write, "TestSection")).toEqual(["tsec_2", "tsec_3"])
  })

  it("keeps a stale step's tips as stored", () => {
    const config = buildTestConfig()
    config.blocks![0].areas!.tips.blocks = ["tip"]
    const narrowed = prepareRegistry(config)

    const write = planSave(
      buildStored(
        [
          {
            id: "tsec_1",
            name: "sections",
            parent_id: null,
            recipe_id: "trec_1",
            steps: [{ id: "tstep_1", rank: 0, area_id: "tsec_1" }],
          },
          {
            id: "tsec_2",
            name: "tips",
            parent_id: "tstep_1",
            recipe_id: "trec_1",
            steps: [{ id: "tstep_2", rank: 0, area_id: "tsec_2" }],
          },
          {
            id: "tsec_3",
            name: "tips",
            parent_id: "tstep_2",
            recipe_id: "trec_1",
            tips: [{ id: "ttip_1", rank: 0, area_id: "tsec_3" }],
          },
        ],
        narrowed
      ),
      buildEdit({
        sections: [
          {
            id: "tstep_1",
            block_type: "step",
            tips: [{ id: "tstep_2", block_type: "step" }],
          },
        ],
      }),
      narrowed
    )

    expect(rowsOf(write.update, "TestStep")).toEqual([
      { id: "tstep_1", rank: 0, area_id: "tsec_1" },
      { id: "tstep_2", rank: 0 },
    ])
    expect(write.delete).toEqual([])
  })
})

describe("prepareDocumentWrite, on rich text", () => {
  const document = {
    root: {
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "text", text: "Hot" }] },
      ],
    },
  }
  const empty = {
    root: { type: "root", children: [{ type: "paragraph", children: [] }] },
  }

  /**
   * Builds a registry whose recipe's cover and callout's body are `richtext` fields.
   *
   * @returns The registry.
   */
  const buildRichTextRegistry = (): Registry => {
    const config = buildTestConfig()
    config.collections[0].fields!.cover = { type: "richtext", label: "Body" }
    config.blocks!.find(({ slug }) => slug === "callout")!.fields!.body = {
      type: "richtext",
      label: "Body",
    }

    return prepareRegistry(config)
  }

  it("writes a document's rich text as its JSON, and an empty one as null", () => {
    const richTextRegistry = buildRichTextRegistry()

    expect(
      planSave(
        undefined,
        { values: { title: "Soup", cover: document } },
        richTextRegistry
      ).create[0].rows[0]
    ).toEqual({ id: "trec_1", title: "Soup", cover: JSON.stringify(document) })
    expect(
      planSave(buildStored(), { values: { cover: empty } }, richTextRegistry)
        .update[0].rows[0]
    ).toEqual({ id: "trec_1", cover: null })
  })

  it("writes a block's rich text as its JSON, in a step's tips too", () => {
    const write = planSave(
      undefined,
      {
        values: { title: "Soup" },
        areas: {
          sections: [
            { block_type: "callout", body: document },
            {
              block_type: "step",
              heading: "Chop",
              tips: [{ block_type: "step", heading: "Halve" }],
            },
          ],
        },
      },
      buildRichTextRegistry()
    )
    const callouts = write.create.find(({ key }) => key === "TestCallout")

    expect(callouts?.rows[0]).toMatchObject({ body: JSON.stringify(document) })
  })

  it("leaves a value of another field as it is", () => {
    expect(
      planSave(buildStored(), { values: { notes: '{"root":1}' } }).update[0]
        .rows[0]
    ).toEqual({ id: "trec_1", notes: '{"root":1}' })
  })
})
