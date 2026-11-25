import { TEST_CONTENT_MODULE } from "../../../../../integration-tests/modules/test-content"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type CmsRelatedDocuments,
  type ListCmsRelatedDocumentsInput,
  listCmsRelatedDocumentsStep,
} from "../list-cms-related-documents"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Builds the test module's service with the recipes' list method.
 *
 * @param ids - The ids of the live recipes the method answers.
 * @returns The service.
 */
const createTestModuleService = (ids: string[] = []) => ({
  listTestRecipes: jest.fn(
    async (_filters: Record<string, unknown>, _config: { select: string[] }) =>
      ids.map((id) => ({ id }))
  ),
})

/**
 * Runs the step.
 *
 * @param input - The collection and the values to check.
 * @param service - The test module's service.
 * @returns The step's output.
 */
const runStep = async (
  input: ListCmsRelatedDocumentsInput,
  service = createTestModuleService()
): Promise<CmsRelatedDocuments> => {
  const dependencies: Record<string, unknown> = {
    [CMS_MODULE]: { getConfig: () => buildTestConfig() },
    [TEST_CONTENT_MODULE]: service,
  }
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName in dependencies) {
        return dependencies[registrationName]
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = listCmsRelatedDocumentsStep as unknown as (
    stepInput: ListCmsRelatedDocumentsInput,
    context: { container: typeof container }
  ) => Promise<{ output: CmsRelatedDocuments }>

  return (await invoke(input, { container })).output
}

describe("listCmsRelatedDocumentsStep", () => {
  it("reads the ids a relationship holds among the target's live documents", async () => {
    const service = createTestModuleService(["trec_1"])

    await expect(
      runStep(
        {
          collection: "settings",
          document: { featured_recipe_id: "trec_1" },
        },
        service
      )
    ).resolves.toEqual({ featured_recipe_id: ["trec_1"] })
    expect(service.listTestRecipes).toHaveBeenCalledWith(
      { id: ["trec_1"] },
      { select: ["id"] }
    )
  })

  it("answers no live document for an id the target does not hold", async () => {
    await expect(
      runStep({
        collection: "settings",
        document: { featured_recipe_id: "trec_gone" },
      })
    ).resolves.toEqual({ featured_recipe_id: [] })
  })

  it("reads nothing when no relationship holds an id", async () => {
    const service = createTestModuleService()

    await expect(
      runStep(
        {
          collection: "settings",
          document: { title: "Home", featured_recipe_id: null },
        },
        service
      )
    ).resolves.toEqual({})
    expect(service.listTestRecipes).not.toHaveBeenCalled()
  })

  it("reads a recipe pointing at itself as any other", async () => {
    await expect(
      runStep(
        {
          collection: "recipe",
          document: { related_recipe_id: "trec_1" },
        },
        createTestModuleService(["trec_1"])
      )
    ).resolves.toEqual({ related_recipe_id: ["trec_1"] })
  })
})
