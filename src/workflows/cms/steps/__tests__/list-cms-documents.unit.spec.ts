import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type CmsDocument,
  type ListCmsDocumentsInput,
  type ListCmsDocumentsOutput,
  listCmsDocumentsStep,
} from "../list-cms-documents"

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
  pagination: { skip: number; take: number; order: Record<string, string> }
}

/**
 * Builds a document as Query returns it.
 *
 * @param overrides - Columns to set on the document.
 * @returns The document.
 */
const buildDocument = (overrides: Partial<CmsDocument> = {}): CmsDocument => ({
  id: "trec_1",
  status: "draft",
  updated_at: "2026-11-09T10:00:00.000Z",
  title: "Soup",
  ...overrides,
})

/**
 * Builds Query with its graph method.
 *
 * @param documents - The page the method returns.
 * @param count - The total count its metadata reports.
 * @returns Query.
 */
const createQuery = (
  documents: CmsDocument[] = [buildDocument()],
  count = documents.length
) => ({
  graph: jest.fn(
    async (_input: GraphInput, _options: Record<string, unknown>) => ({
      data: documents,
      metadata: { count, skip: 0, take: documents.length },
    })
  ),
})

/**
 * Runs the step with a container holding the CMS module and Query.
 *
 * @param input - The step's input, over the recipe collection unless it says otherwise.
 * @param query - Query.
 * @returns The step's output.
 */
const runStep = async (
  input: Partial<ListCmsDocumentsInput>,
  query = createQuery()
): Promise<ListCmsDocumentsOutput> => {
  const dependencies: Record<string, unknown> = {
    [CMS_MODULE]: { getConfig: () => buildTestConfig() },
    [ContainerRegistrationKeys.QUERY]: query,
  }
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName in dependencies) {
        return dependencies[registrationName]
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = listCmsDocumentsStep as unknown as (
    stepInput: ListCmsDocumentsInput,
    context: { container: typeof container }
  ) => Promise<{ output: ListCmsDocumentsOutput }>

  const response = await invoke(
    { collection: "recipe", limit: 20, offset: 0, ...input },
    { container }
  )

  return response.output
}

describe("listCmsDocumentsStep", () => {
  it("returns the page of documents with the total count", async () => {
    const documents = [buildDocument(), buildDocument({ id: "trec_2" })]

    const result = await runStep({}, createQuery(documents, 7))

    expect(result).toEqual({ documents, count: 7 })
  })

  it("reads the model's columns with no filter, the newest edits first, by default", async () => {
    const query = createQuery()

    await runStep({}, query)

    expect(query.graph).toHaveBeenCalledWith(
      {
        entity: "test_recipe",
        fields: ["*"],
        filters: {},
        pagination: { skip: 0, take: 20, order: { updated_at: "DESC" } },
      },
      {}
    )
  })

  it("passes the store's filters, status keeping its own value", async () => {
    const query = createQuery()

    await runStep(
      { filters: { vegan: true, status: "draft" }, status: "published" },
      query
    )

    expect(query.graph.mock.calls[0][0].filters).toEqual({
      vegan: true,
      status: "published",
    })
  })

  it("passes q and status as filters", async () => {
    const query = createQuery()

    await runStep({ q: "soup", status: "published" }, query)

    expect(query.graph.mock.calls[0][0].filters).toEqual({
      q: "soup",
      status: "published",
    })
  })

  it("turns limit and offset into take and skip", async () => {
    const query = createQuery()

    await runStep({ limit: 5, offset: 10 }, query)

    expect(query.graph.mock.calls[0][0].pagination).toMatchObject({
      skip: 10,
      take: 5,
    })
  })

  it.each([
    ["title", { title: "ASC" }],
    ["-title", { title: "DESC" }],
    ["status", { status: "ASC" }],
  ])("orders by %s", async (order, expected) => {
    const query = createQuery()

    await runStep({ order }, query)

    expect(query.graph.mock.calls[0][0].pagination.order).toEqual(expected)
  })

  it.each(["extra", "labels", "nope", "summary"])(
    "refuses to order by %s, which is not a scalar column or holds rich text",
    async (order) => {
      const query = createQuery()

      await expect(runStep({ order }, query)).rejects.toMatchObject({
        type: "invalid_data",
      })
      expect(query.graph).not.toHaveBeenCalled()
    }
  )

  it("reads through the cache with the collection's list tag when asked", async () => {
    const query = createQuery()

    await runStep({ cache: true }, query)

    expect(query.graph.mock.calls[0][1]).toEqual({
      cache: {
        enable: true,
        tags: ["TestRecipe:list:*"],
        computeAutomaticTags: true,
      },
    })
  })

  it("passes no cache option by default", async () => {
    const query = createQuery()

    await runStep({}, query)

    expect(query.graph.mock.calls[0][1]).toEqual({})
  })

  it("reads only what the store's fields select, and builds the areas they name", async () => {
    const query = createQuery([
      buildDocument({
        areas: [
          {
            id: "tsec_1",
            name: "sections",
            parent_id: null,
            steps: [
              { id: "tstep_1", rank: 0, area_id: "tsec_1", heading: "Cut" },
            ],
          },
        ],
      }),
    ])

    const result = await runStep(
      { fields: ["title", "sections.step.heading"] },
      query
    )

    expect(query.graph.mock.calls[0][0].fields).toEqual(
      expect.arrayContaining(["title", "areas.steps.heading"])
    )
    expect(result.documents[0].sections).toEqual([
      expect.objectContaining({ id: "tstep_1", block_type: "step" }),
    ])
  })

  it("refuses a page of more than 50 that reads areas, reading nothing", async () => {
    const query = createQuery()

    await expect(
      runStep({ fields: ["sections.*"], limit: 51 }, query)
    ).rejects.toMatchObject({ type: "invalid_data" })
    expect(query.graph).not.toHaveBeenCalled()
  })

  it("refuses an unknown collection", async () => {
    await expect(runStep({ collection: "nope" })).rejects.toMatchObject({
      type: "not_found",
    })
  })
})
