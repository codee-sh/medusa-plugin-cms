import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type CmsCollectionOptions,
  type GetCmsCollectionInput,
  getCmsCollectionStep,
} from "../get-cms-collection"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Runs the step on a collection of the test config.
 *
 * @param collection - The collection's slug.
 * @returns The step's output.
 */
const runStep = async (collection: string): Promise<CmsCollectionOptions> => {
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName === CMS_MODULE) {
        return { getConfig: () => buildTestConfig() }
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = getCmsCollectionStep as unknown as (
    input: GetCmsCollectionInput,
    context: { container: typeof container }
  ) => Promise<{ output: CmsCollectionOptions }>

  return (await invoke({ collection }, { container })).output
}

describe("getCmsCollectionStep", () => {
  it("answers that a collection has drafts", async () => {
    expect(await runStep("recipe")).toEqual({ slug: "recipe", drafts: true })
  })

  it("answers that a collection has no drafts", async () => {
    expect(await runStep("tag")).toEqual({ slug: "tag", drafts: false })
  })

  it("refuses an unknown collection", async () => {
    await expect(runStep("menu")).rejects.toMatchObject({ type: "not_found" })
  })
})
