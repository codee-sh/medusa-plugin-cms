import { CMS_MODULE } from "../../../../modules/cms"
import {
  type DeleteCmsVersionsInput,
  deleteCmsVersionsStep,
} from "../delete-cms-versions"

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

/**
 * Builds the `cms` service with the methods a delete and its undo call.
 *
 * @returns The service.
 */
const createCmsService = () => ({
  softDeleteCmsVersions: jest.fn(async () => undefined),
  restoreCmsVersions: jest.fn(async () => undefined),
})

/**
 * Builds a container holding the `cms` service.
 *
 * @param service - The service.
 * @returns The container.
 */
const containerFor = (service: ReturnType<typeof createCmsService>) => ({
  resolve: jest.fn((registrationName: string) => {
    if (registrationName === CMS_MODULE) {
      return service
    }
    throw new Error(`Unexpected dependency: ${registrationName}`)
  }),
})

type Container = ReturnType<typeof containerFor>
const [invoke, compensate] = deleteCmsVersionsStep as unknown as [
  (
    input: DeleteCmsVersionsInput,
    context: { container: Container }
  ) => Promise<{ compensateInput: string[] }>,
  (
    ids: string[] | undefined,
    context: { container: Container }
  ) => Promise<void>,
]

describe("deleteCmsVersionsStep", () => {
  it("soft-deletes the versions, and restores the same ones during compensation", async () => {
    const service = createCmsService()

    const response = await invoke(
      { ids: ["cmsver_1", "cmsver_2"] },
      { container: containerFor(service) }
    )
    await compensate(response.compensateInput, {
      container: containerFor(service),
    })

    expect(service.softDeleteCmsVersions).toHaveBeenCalledWith([
      "cmsver_1",
      "cmsver_2",
    ])
    expect(service.restoreCmsVersions).toHaveBeenCalledWith([
      "cmsver_1",
      "cmsver_2",
    ])
  })

  it("does nothing without ids", async () => {
    const service = createCmsService()

    const response = await invoke(
      { ids: [] },
      { container: containerFor(service) }
    )
    await compensate(response.compensateInput, {
      container: containerFor(service),
    })

    expect(service.softDeleteCmsVersions).not.toHaveBeenCalled()
    expect(service.restoreCmsVersions).not.toHaveBeenCalled()
  })
})
