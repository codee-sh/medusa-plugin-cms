import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type CmsReference,
  type ListCmsReferencesInput,
  listCmsReferencesStep,
} from "../list-cms-references"

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
 * Builds Query with its graph method, answering the live rows of each entity.
 *
 * @param rows - Per entity, the ids of the rows it holds.
 * @returns Query.
 */
const createQuery = (rows: Record<string, string[]> = {}) => ({
  graph: jest.fn(async ({ entity }: GraphInput) => ({
    data: (rows[entity] ?? []).map((id) => ({ id })),
  })),
})

/**
 * Runs the step.
 *
 * @param input - The collection and the document's id.
 * @param query - Query.
 * @returns The step's output.
 */
const runStep = async (
  input: ListCmsReferencesInput,
  query = createQuery()
): Promise<CmsReference[]> => {
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
  const invoke = listCmsReferencesStep as unknown as (
    stepInput: ListCmsReferencesInput,
    context: { container: typeof container }
  ) => Promise<{ output: CmsReference[] }>

  return (await invoke(input, { container })).output
}

describe("listCmsReferencesStep", () => {
  it("reads every relationship pointing at the collection, by its key", async () => {
    const query = createQuery({
      test_settings: ["tset_1"],
      test_recipe: ["trec_2"],
    })

    const references = await runStep(
      { collection: "recipe", id: "trec_1" },
      query
    )

    expect(references).toEqual(
      expect.arrayContaining([
        {
          collection: "settings",
          field: "featured_recipe_id",
          id: "tset_1",
        },
        { collection: "recipe", field: "related_recipe_id", id: "trec_2" },
      ])
    )
    expect(references).toHaveLength(2)
    expect(query.graph).toHaveBeenCalledWith({
      entity: "test_settings",
      fields: ["id"],
      filters: { featured_recipe_id: "trec_1" },
    })
    expect(query.graph).toHaveBeenCalledWith({
      entity: "test_recipe",
      fields: ["id"],
      filters: { related_recipe_id: "trec_1" },
    })
  })

  it("leaves a document pointing at itself out of its own references", async () => {
    await expect(
      runStep(
        { collection: "recipe", id: "trec_1" },
        createQuery({ test_recipe: ["trec_1"] })
      )
    ).resolves.toEqual([])
  })

  it("answers no reference when nothing points at the document", async () => {
    await expect(
      runStep({ collection: "recipe", id: "trec_1" })
    ).resolves.toEqual([])
  })

  it("reads nothing for a collection no relationship points at", async () => {
    const query = createQuery()

    await expect(
      runStep({ collection: "tag", id: "ttag_1" }, query)
    ).resolves.toEqual([])
    expect(query.graph).not.toHaveBeenCalled()
  })
})
