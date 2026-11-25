import { TEST_CONTENT_MODULE } from "../../../../../integration-tests/modules/test-content"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { RowIds } from "../../../../lib/document/types"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type DeleteCmsDocumentContentInput,
  deleteCmsDocumentContentStep,
} from "../delete-cms-document-content"

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

type DeletedRows = { deleted: RowIds; live: RowIds }

/**
 * Builds the test module's service with the methods a delete and its undo call. A restore of the
 * recipe brings back its area, its live steps and a step an earlier save removed.
 *
 * @returns The service.
 */
const createTestModuleService = () => ({
  softDeleteTestRecipes: jest.fn(async (_ids: string[]) => undefined),
  softDeleteTestSteps: jest.fn(async (_ids: string[]) => undefined),
  softDeleteTestCallouts: jest.fn(async (_ids: string[]) => undefined),
  restoreTestSteps: jest.fn(async (_ids: string[]) => ({
    test_step_id: ["tstep_2"],
  })),
  restoreTestRecipes: jest.fn(async (_ids: string[]) => ({
    test_recipe_id: ["trec_1"],
    test_section_id: ["tsec_1"],
    test_step_id: ["tstep_1", "tstep_2", "tstep_old"],
    test_callout_id: ["tcall_1"],
  })),
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
  const [invoke, compensate] = deleteCmsDocumentContentStep as unknown as [
    (
      input: DeleteCmsDocumentContentInput,
      context: { container: Container }
    ) => Promise<{ compensateInput: DeletedRows }>,
    (
      deletedRows: DeletedRows | undefined,
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

const STORED = {
  id: "trec_1",
  areas: [{ id: "tsec_1", name: "sections", parent_id: null }],
  sections: [
    { id: "tstep_1", block_type: "step", rank: 0, area_id: "tsec_1" },
    { id: "tstep_2", block_type: "step", rank: 1, area_id: "tsec_1" },
    { id: "tcall_1", block_type: "callout", rank: 2, area_id: "tsec_1" },
  ],
}

const DELETE: RowIds = [
  { key: "TestStep", ids: ["tstep_2"] },
  { key: "TestCallout", ids: ["tcall_1"] },
]

describe("deleteCmsDocumentContentStep", () => {
  it("soft-deletes the rows through the generated methods", async () => {
    const service = createTestModuleService()
    const { invoke } = getInvokeAndCompensate()

    await invoke(
      { collection: "recipe", delete: DELETE, stored: STORED },
      { container: containerFor(service) }
    )

    expect(service.softDeleteTestSteps).toHaveBeenCalledWith(["tstep_2"])
    expect(service.softDeleteTestCallouts).toHaveBeenCalledWith(["tcall_1"])
  })

  it("restores what the run deleted during compensation, keeping what was live", async () => {
    const service = createTestModuleService()
    const { invoke, compensate } = getInvokeAndCompensate()

    const response = await invoke(
      { collection: "recipe", delete: DELETE.slice(0, 1), stored: STORED },
      { container: containerFor(service) }
    )
    await compensate(response.compensateInput, {
      container: containerFor(service),
    })

    expect(service.restoreTestSteps).toHaveBeenCalledWith(["tstep_2"])
    // The restored step was live, so nothing is deleted again.
    expect(service.softDeleteTestSteps).toHaveBeenCalledTimes(1)
  })

  it("answers a permanent failure holding the calls made when a later call fails", async () => {
    const service = createTestModuleService()
    service.softDeleteTestCallouts.mockRejectedValueOnce(new Error("Lost"))
    const { invoke } = getInvokeAndCompensate()

    const error = await catchFailure(
      invoke(
        { collection: "recipe", delete: DELETE, stored: STORED },
        { container: containerFor(service) }
      )
    )

    expect(error.message).toBe("Lost")
    expect(error.getStepResponse().output).toMatchObject({
      deleted: [{ key: "TestStep", ids: ["tstep_2"] }],
    })
  })

  it("throws a first call's error as it is", async () => {
    const service = createTestModuleService()
    const failure = new Error("Lost")
    service.softDeleteTestSteps.mockRejectedValueOnce(failure)
    const { invoke } = getInvokeAndCompensate()

    await expect(
      invoke(
        { collection: "recipe", delete: DELETE, stored: STORED },
        { container: containerFor(service) }
      )
    ).rejects.toBe(failure)
  })

  it("does nothing during compensation when the run deleted nothing", async () => {
    const service = createTestModuleService()
    const { compensate } = getInvokeAndCompensate()

    await compensate(undefined, { container: containerFor(service) })

    expect(service.restoreTestSteps).not.toHaveBeenCalled()
  })

  it("makes no call and keeps nothing to undo when the write deletes nothing", async () => {
    const service = createTestModuleService()
    const { invoke } = getInvokeAndCompensate()

    const response = await invoke(
      { collection: "recipe", delete: [], stored: STORED },
      { container: containerFor(service) }
    )

    expect(response.compensateInput).toBeUndefined()
    expect(service.softDeleteTestSteps).not.toHaveBeenCalled()
  })

  it("restores a deleted document and deletes again a block removed before, during compensation", async () => {
    const service = createTestModuleService()
    const { invoke, compensate } = getInvokeAndCompensate()

    const response = await invoke(
      {
        collection: "recipe",
        delete: [{ key: "TestRecipe", ids: ["trec_1"] }],
        stored: STORED,
      },
      { container: containerFor(service) }
    )
    await compensate(response.compensateInput, {
      container: containerFor(service),
    })

    expect(service.softDeleteTestRecipes).toHaveBeenCalledWith(["trec_1"])
    expect(service.restoreTestRecipes).toHaveBeenCalledWith(["trec_1"])
    expect(service.softDeleteTestSteps).toHaveBeenCalledWith(["tstep_old"])
    expect(service.softDeleteTestCallouts).not.toHaveBeenCalled()
  })
})
