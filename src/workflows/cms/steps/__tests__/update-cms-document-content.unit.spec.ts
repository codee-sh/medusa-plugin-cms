import { TEST_CONTENT_MODULE } from "../../../../../integration-tests/modules/test-content"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { DocumentWrite } from "../../../../lib/document/types"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type UpdateCmsDocumentContentInput,
  updateCmsDocumentContentStep,
} from "../update-cms-document-content"

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

type StoredRows = { key: string; rows: Record<string, unknown>[] }[]

/**
 * Builds the test module's service with the method an update calls.
 *
 * @returns The service, which returns each updated row as given.
 */
const createTestModuleService = () => ({
  updateTestRecipes: jest.fn(async (rows: Record<string, unknown>[]) =>
    rows.map((row) => ({ ...row, status: "draft" }))
  ),
  updateTestSteps: jest.fn(async (rows: Record<string, unknown>[]) => rows),
  updateTestTips: jest.fn(async (rows: Record<string, unknown>[]) => rows),
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
  const [invoke, compensate] = updateCmsDocumentContentStep as unknown as [
    (
      input: UpdateCmsDocumentContentInput,
      context: { container: Container }
    ) => Promise<{ compensateInput: StoredRows }>,
    (
      storedRows: StoredRows | undefined,
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

const UPDATE: DocumentWrite["update"] = [
  {
    key: "TestRecipe",
    rows: [{ id: "trec_1", notes: null, updated_by: "user_2" }],
  },
]

const STORED = {
  id: "trec_1",
  title: "Soup",
  notes: "Simmer",
  created_by: "user_1",
  updated_by: "user_1",
  areas: [{ id: "tsec_1", name: "sections", parent_id: null }],
  sections: [
    {
      id: "tstep_1",
      block_type: "step",
      heading: "Chop",
      rank: 0,
      area_id: "tsec_1",
    },
  ],
}

const STEP_UPDATE: DocumentWrite["update"][number] = {
  key: "TestStep",
  rows: [{ id: "tstep_1", heading: "Dice", rank: 1, area_id: "tsec_2" }],
}

describe("updateCmsDocumentContentStep", () => {
  it("updates the rows through the generated method", async () => {
    const service = createTestModuleService()
    const { invoke } = getInvokeAndCompensate()

    await invoke(
      { collection: "recipe", update: UPDATE, stored: STORED },
      { container: containerFor(service) }
    )

    expect(service.updateTestRecipes).toHaveBeenCalledWith(UPDATE[0].rows)
  })

  it("writes the stored values of the updated columns back during compensation", async () => {
    const service = createTestModuleService()
    const { invoke, compensate } = getInvokeAndCompensate()

    const response = await invoke(
      { collection: "recipe", update: UPDATE, stored: STORED },
      { container: containerFor(service) }
    )
    await compensate(response.compensateInput, {
      container: containerFor(service),
    })

    expect(service.updateTestRecipes).toHaveBeenLastCalledWith([
      { id: "trec_1", notes: "Simmer", updated_by: "user_1" },
    ])
  })

  it("does nothing during compensation when the run wrote nothing", async () => {
    const service = createTestModuleService()
    const { compensate } = getInvokeAndCompensate()

    await compensate(undefined, { container: containerFor(service) })

    expect(service.updateTestRecipes).not.toHaveBeenCalled()
  })

  it("writes a block's stored values back during compensation", async () => {
    const service = createTestModuleService()
    const { invoke, compensate } = getInvokeAndCompensate()

    const response = await invoke(
      {
        collection: "recipe",
        update: [...UPDATE, STEP_UPDATE],
        stored: STORED,
      },
      { container: containerFor(service) }
    )
    await compensate(response.compensateInput, {
      container: containerFor(service),
    })

    expect(service.updateTestSteps).toHaveBeenLastCalledWith([
      { id: "tstep_1", heading: "Chop", rank: 0, area_id: "tsec_1" },
    ])
  })

  it("writes a tip's stored values back during compensation, from a step's tips", async () => {
    const service = createTestModuleService()
    const { invoke, compensate } = getInvokeAndCompensate()
    const stored = {
      ...STORED,
      sections: [
        {
          ...STORED.sections[0],
          tips: [
            {
              id: "ttip_1",
              block_type: "tip",
              text: "Sharp",
              rank: 0,
              area_id: "tsec_2",
            },
          ],
        },
      ],
    }

    const response = await invoke(
      {
        collection: "recipe",
        update: [
          {
            key: "TestTip",
            rows: [{ id: "ttip_1", text: "Blunt", rank: 3, area_id: "tsec_1" }],
          },
        ],
        stored,
      },
      { container: containerFor(service) }
    )
    await compensate(response.compensateInput, {
      container: containerFor(service),
    })

    expect(service.updateTestTips).toHaveBeenLastCalledWith([
      { id: "ttip_1", text: "Sharp", rank: 0, area_id: "tsec_2" },
    ])
  })

  it("answers a permanent failure holding the calls made when a later call fails", async () => {
    const service = createTestModuleService()
    service.updateTestSteps.mockRejectedValueOnce(new Error("Lost"))
    const { invoke } = getInvokeAndCompensate()

    const error = await catchFailure(
      invoke(
        {
          collection: "recipe",
          update: [...UPDATE, STEP_UPDATE],
          stored: STORED,
        },
        { container: containerFor(service) }
      )
    )

    expect(error.message).toBe("Lost")
    expect(error.getStepResponse().output).toEqual([
      {
        key: "TestRecipe",
        rows: [{ id: "trec_1", notes: "Simmer", updated_by: "user_1" }],
      },
    ])
  })

  it("throws a first call's error as it is", async () => {
    const service = createTestModuleService()
    const failure = new Error("Lost")
    service.updateTestRecipes.mockRejectedValueOnce(failure)
    const { invoke } = getInvokeAndCompensate()

    await expect(
      invoke(
        { collection: "recipe", update: UPDATE, stored: STORED },
        { container: containerFor(service) }
      )
    ).rejects.toBe(failure)
  })
})
