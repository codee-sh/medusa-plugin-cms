import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type ValidateCmsDraftsInput,
  validateCmsDraftsStep,
} from "../validate-cms-drafts"

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
 * @returns What the step resolves to.
 */
const runStep = async (collection: string) => {
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName === CMS_MODULE) {
        return { getConfig: () => buildTestConfig() }
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = validateCmsDraftsStep as unknown as (
    input: ValidateCmsDraftsInput,
    context: { container: typeof container }
  ) => Promise<{ output: void }>

  return invoke({ collection }, { container })
}

describe("validateCmsDraftsStep", () => {
  it("passes a collection with drafts", async () => {
    await expect(runStep("recipe")).resolves.toMatchObject({
      output: undefined,
    })
  })

  it("refuses a collection without drafts", async () => {
    await expect(runStep("tag")).rejects.toMatchObject({
      type: "not_allowed",
      message:
        "Drafts and versions are off for this collection, so changes go live when saved.",
    })
  })
})
