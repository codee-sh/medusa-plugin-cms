import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { Config, LayoutSectionConfig } from "../../../../lib/config/types"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type GetCmsDocumentInput,
  getCmsDocumentStep,
} from "../get-cms-document"
import type { CmsDocument } from "../list-cms-documents"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

type GraphInput = {
  entity: string
  fields: string[]
  filters: Record<string, unknown>
}

/**
 * Builds Query with its graph method.
 *
 * @param rows - The live rows the method returns.
 * @returns Query.
 */
const createQuery = (rows: Record<string, unknown>[] = []) => ({
  graph: jest.fn(
    async (_input: GraphInput, _options: Record<string, unknown>) => ({
      data: rows,
    })
  ),
})

/**
 * Runs the step.
 *
 * @param input - The collection and the document's id.
 * @param query - Query.
 * @param config - The CMS config; the step is loaded on its own when one is given, because the
 * registry is built once per module load.
 * @param logger - The logger.
 * @returns The step's output.
 */
const runStep = async (
  input: GetCmsDocumentInput,
  query = createQuery(),
  config?: Config,
  logger = { warn: jest.fn() }
): Promise<CmsDocument> => {
  const dependencies: Record<string, unknown> = {
    [CMS_MODULE]: { getConfig: () => config ?? buildTestConfig() },
    [ContainerRegistrationKeys.QUERY]: query,
    [ContainerRegistrationKeys.LOGGER]: logger,
  }
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName in dependencies) {
        return dependencies[registrationName]
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  let step = getCmsDocumentStep

  if (config) {
    jest.isolateModules(() => {
      step = require("../get-cms-document").getCmsDocumentStep
    })
  }

  const invoke = step as unknown as (
    stepInput: GetCmsDocumentInput,
    context: { container: typeof container }
  ) => Promise<{ output: CmsDocument }>

  return (await invoke(input, { container })).output
}

describe("getCmsDocumentStep", () => {
  it("reads the document with its area rows and every configured block type", async () => {
    const query = createQuery([{ id: "trec_1", areas: [] }])

    await runStep({ collection: "recipe", id: "trec_1" }, query)

    expect(query.graph).toHaveBeenCalledWith(
      {
        entity: "test_recipe",
        fields: [
          "*",
          "areas.*",
          "areas.steps.*",
          "areas.callouts.*",
          "areas.tips.*",
        ],
        filters: { id: "trec_1" },
      },
      {}
    )
  })

  it("returns the document's columns, its area rows without their blocks, and each area under its name", async () => {
    const area = {
      id: "tsec_1",
      name: "sections",
      parent_id: null,
      recipe_id: "trec_1",
      steps: [{ id: "tstep_1", heading: "Chop", rank: 1, area_id: "tsec_1" }],
      callouts: [{ id: "tcall_1", body: "Hot", rank: 0, area_id: "tsec_1" }],
    }
    const query = createQuery([
      {
        id: "trec_1",
        status: "draft",
        updated_at: "2026-11-09T10:00:00.000Z",
        title: "Soup",
        areas: [area],
      },
    ])

    const document = await runStep(
      { collection: "recipe", id: "trec_1" },
      query
    )

    expect(document).toEqual({
      id: "trec_1",
      status: "draft",
      updated_at: "2026-11-09T10:00:00.000Z",
      title: "Soup",
      areas: [{ id: "tsec_1", name: "sections", parent_id: null }],
      sections: [
        { ...area.callouts[0], block_type: "callout" },
        { ...area.steps[0], block_type: "step", tips: [] },
      ],
    })
  })

  it("puts a step's tips under it, and logs once the area rows no block it reads holds", async () => {
    const logger = { warn: jest.fn() }
    const query = createQuery([
      {
        id: "trec_1",
        areas: [
          {
            id: "tsec_1",
            name: "sections",
            parent_id: null,
            steps: [{ id: "tstep_1", rank: 0, area_id: "tsec_1" }],
          },
          {
            id: "tsec_2",
            name: "tips",
            parent_id: "tstep_1",
            tips: [{ id: "ttip_1", rank: 0, area_id: "tsec_2" }],
          },
          { id: "tsec_3", name: "tips", parent_id: "tstep_gone" },
          { id: "tsec_4", name: "tips", parent_id: "tstep_gone_too" },
        ],
      },
    ])

    const document = await runStep(
      { collection: "recipe", id: "trec_1" },
      query,
      undefined,
      logger
    )

    expect((document.sections as Record<string, unknown>[])[0].tips).toEqual([
      { id: "ttip_1", rank: 0, area_id: "tsec_2", block_type: "tip" },
    ])
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("tsec_3, tsec_4")
    )
  })

  it("reads only the columns of a collection without areas", async () => {
    const config = buildTestConfig()
    delete config.collections[0].areas
    config.collections[0].admin.sections =
      config.collections[0].admin.sections.filter(
        ({ key }) => key !== "content"
      )
    const query = createQuery([{ id: "trec_1" }])

    await runStep({ collection: "recipe", id: "trec_1" }, query, config)

    expect(query.graph).toHaveBeenCalledWith(
      expect.objectContaining({ fields: ["*"] }),
      {}
    )
  })

  it("reads only the document's columns when the areas are left out", async () => {
    const query = createQuery([{ id: "trec_1", status: "draft" }])

    const document = await runStep(
      { collection: "recipe", id: "trec_1", with_areas: false },
      query
    )

    expect(query.graph).toHaveBeenCalledWith(
      expect.objectContaining({ fields: ["*"] }),
      {}
    )
    expect(document).toEqual({ id: "trec_1", status: "draft" })
  })

  it("answers not found for an unknown or deleted document", async () => {
    await expect(
      runStep({ collection: "recipe", id: "trec_gone" })
    ).rejects.toMatchObject({
      type: "not_found",
      message: 'Document "trec_gone" was not found in collection "recipe"',
    })
  })

  it("reads by the slug field's column, in the status asked for", async () => {
    const query = createQuery([{ id: "trec_1", slug: "soup" }])

    await runStep(
      {
        collection: "recipe",
        slug: "soup",
        status: "published",
        with_areas: false,
      },
      query
    )

    expect(query.graph.mock.calls[0][0].filters).toEqual({
      slug: "soup",
      status: "published",
    })
  })

  it("answers not found for an unknown slug, naming it", async () => {
    await expect(
      runStep({ collection: "recipe", slug: "gone" })
    ).rejects.toMatchObject({
      type: "not_found",
      message: 'Document with slug "gone" was not found in collection "recipe"',
    })
  })

  it("answers not found for a slug read of a collection without a slug field, reading nothing", async () => {
    const config = buildTestConfig()
    delete config.collections[0].fields?.slug
    const recipeSection = config.collections[0].admin
      .sections[0] as LayoutSectionConfig
    recipeSection.fields = recipeSection.fields.filter(
      (item) => item !== "slug"
    )
    const query = createQuery([{ id: "trec_1" }])

    await expect(
      runStep({ collection: "recipe", slug: "soup" }, query, config)
    ).rejects.toMatchObject({
      type: "not_found",
      message: 'Collection "recipe" has no slug field',
    })
    expect(query.graph).not.toHaveBeenCalled()
  })

  it("reads through the cache with the collection's list tag when asked", async () => {
    const query = createQuery([{ id: "trec_1" }])

    await runStep(
      { collection: "recipe", id: "trec_1", with_areas: false, cache: true },
      query
    )

    expect(query.graph.mock.calls[0][1]).toEqual({
      cache: {
        enable: true,
        tags: ["TestRecipe:list:*"],
        computeAutomaticTags: true,
      },
    })
  })

  it("passes no cache option by default", async () => {
    const query = createQuery([{ id: "trec_1" }])

    await runStep(
      { collection: "recipe", id: "trec_1", with_areas: false },
      query
    )

    expect(query.graph.mock.calls[0][1]).toEqual({})
  })

  it("reads only what the store's fields select, and warns of no area row a block type it skips holds", async () => {
    const logger = { warn: jest.fn() }
    const query = createQuery([
      {
        id: "trec_1",
        title: "Soup",
        areas: [
          { id: "tsec_1", name: "sections", parent_id: null, steps: [] },
          { id: "tsec_2", name: "tips", parent_id: "tstep_unread" },
        ],
      },
    ])

    await runStep(
      {
        collection: "recipe",
        id: "trec_1",
        fields: ["title", "sections.step.heading"],
      },
      query,
      undefined,
      logger
    )

    expect(query.graph.mock.calls[0][0].fields.sort()).toEqual([
      "areas.id",
      "areas.name",
      "areas.parent_id",
      "areas.steps.area_id",
      "areas.steps.heading",
      "areas.steps.id",
      "areas.steps.rank",
      "id",
      "title",
    ])
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it("answers not found for an unknown collection", async () => {
    await expect(
      runStep({ collection: "unknown", id: "trec_1" })
    ).rejects.toMatchObject({ type: "not_found" })
  })
})
