import { TEST_CONTENT_MODULE } from "../../../../../integration-tests/modules/test-content"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { DocumentWrite } from "../../../../lib/document/types"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type CreateCmsDocumentContentInput,
  createCmsDocumentContentStep,
} from "../create-cms-document-content"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (
      _nameOrConfig: unknown,
      invoke: unknown,
      compensate: unknown
    ) => [invoke, compensate],
  }
})

type CreatedIds = { key: string; ids: string[] }[]

/**
 * Builds the test module's service with the methods a write calls.
 *
 * @returns The service, which returns each created row as given.
 */
const createTestModuleService = () => ({
  createTestRecipes: jest.fn(async (rows: Record<string, unknown>[]) =>
    rows.map((row) => ({ ...row, status: "draft" }))
  ),
  deleteTestRecipes: jest.fn(async (_ids: string[]) => undefined),
  createTestSections: jest.fn(async (rows: Record<string, unknown>[]) => rows),
})

/**
 * Builds a container holding the CMS module and the test module.
 *
 * @param service - The test module's service.
 * @returns The container.
 */
const containerFor = (service: ReturnType<typeof createTestModuleService>) => {
  const dependencies: Record<string, unknown> = {
    [CMS_MODULE]: { getConfig: () => buildTestConfig() },
    [TEST_CONTENT_MODULE]: service,
  }

  return {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName in dependencies) {
        return dependencies[registrationName]
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
}

/**
 * Returns the step's invoke and compensate handlers.
 *
 * @returns Both handlers.
 */
const getInvokeAndCompensate = () => {
  type Container = ReturnType<typeof containerFor>
  const [invoke, compensate] = createCmsDocumentContentStep as unknown as [
    (
      input: CreateCmsDocumentContentInput,
      context: { container: Container }
    ) => Promise<{ compensateInput: CreatedIds }>,
    (
      createdIds: CreatedIds | undefined,
      context: { container: Container }
    ) => Promise<void>,
  ]

  return { invoke, compensate }
}

/**
 * Awaits a call that must fail and returns its error.
 *
 * @param call - The call.
 * @returns The error, with the step response a permanent failure carries.
 */
const catchFailure = async (call: Promise<unknown>) => {
  try {
    await call
  } catch (error) {
    return error as Error & { getStepResponse: () => { output: unknown } }
  }

  throw new Error("Expected the call to fail")
}

const CREATE: DocumentWrite["create"] = [
  {
    key: "TestRecipe",
    rows: [{ id: "trec_1", title: "Soup", notes: "Simmer" }],
  },
]

describe("createCmsDocumentContentStep", () => {
  it("creates the rows through the generated method", async () => {
    const service = createTestModuleService()
    const { invoke } = getInvokeAndCompensate()

    await invoke(
      { collection: "recipe", create: CREATE },
      { container: containerFor(service) }
    )

    expect(service.createTestRecipes).toHaveBeenCalledWith(CREATE[0].rows)
  })

  it("deletes exactly what the run created during compensation", async () => {
    const service = createTestModuleService()
    const { invoke, compensate } = getInvokeAndCompensate()

    const response = await invoke(
      { collection: "recipe", create: CREATE },
      { container: containerFor(service) }
    )
    await compensate(response.compensateInput, {
      container: containerFor(service),
    })

    expect(response.compensateInput).toEqual([
      { key: "TestRecipe", ids: ["trec_1"] },
    ])
    expect(service.deleteTestRecipes).toHaveBeenCalledWith(["trec_1"])
  })

  it("does nothing during compensation when the run wrote nothing", async () => {
    const service = createTestModuleService()
    const { compensate } = getInvokeAndCompensate()

    await compensate(undefined, { container: containerFor(service) })

    expect(service.deleteTestRecipes).not.toHaveBeenCalled()
  })

  it("answers a permanent failure holding the calls made when a later call fails", async () => {
    const service = createTestModuleService()
    service.createTestSections.mockRejectedValueOnce(new Error("Lost"))
    const { invoke } = getInvokeAndCompensate()

    const error = await catchFailure(
      invoke(
        {
          collection: "recipe",
          create: [
            ...CREATE,
            { key: "TestSection", rows: [{ id: "tsec_1", name: "sections" }] },
          ],
        },
        { container: containerFor(service) }
      )
    )

    expect(error.message).toBe("Lost")
    expect(error.getStepResponse().output).toEqual([
      { key: "TestRecipe", ids: ["trec_1"] },
    ])
  })

  it("throws a first call's error as it is", async () => {
    const service = createTestModuleService()
    const failure = new Error("Lost")
    service.createTestRecipes.mockRejectedValueOnce(failure)
    const { invoke } = getInvokeAndCompensate()

    await expect(
      invoke(
        { collection: "recipe", create: CREATE },
        { container: containerFor(service) }
      )
    ).rejects.toBe(failure)
  })
})
