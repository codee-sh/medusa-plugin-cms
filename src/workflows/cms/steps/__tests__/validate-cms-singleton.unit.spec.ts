import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type ValidateCmsSingletonInput,
  validateCmsSingletonStep,
} from "../validate-cms-singleton"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Runs the step against the test config.
 *
 * @param input - The step's input.
 * @returns What the step resolves to.
 */
const runStep = async (input: ValidateCmsSingletonInput) => {
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName === CMS_MODULE) {
        return { getConfig: () => buildTestConfig() }
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = validateCmsSingletonStep as unknown as (
    input: ValidateCmsSingletonInput,
    context: { container: typeof container }
  ) => Promise<{ output: void }>

  return invoke(input, { container })
}

describe("validateCmsSingletonStep", () => {
  it.each([
    ["a create", { operation: "create", count: 3 }],
    ["a delete", { operation: "delete" }],
  ] as const)("passes %s in a list collection", async (_name, operation) => {
    await expect(
      runStep({ collection: "tag", ...operation })
    ).resolves.toMatchObject({ output: undefined })
  })

  it("passes the first create in a singleton", async () => {
    await expect(
      runStep({ collection: "settings", operation: "create", count: 0 })
    ).resolves.toMatchObject({ output: undefined })
  })

  it("refuses a create in a singleton that holds its document", async () => {
    await expect(
      runStep({ collection: "settings", operation: "create", count: 1 })
    ).rejects.toMatchObject({
      type: "not_allowed",
      message:
        "This collection holds one document, which already exists. Edit it instead.",
    })
  })

  it("refuses a delete in a singleton", async () => {
    await expect(
      runStep({ collection: "settings", operation: "delete" })
    ).rejects.toMatchObject({
      type: "not_allowed",
      message:
        "This collection holds one document, which cannot be deleted. Edit it instead.",
    })
  })
})
