import { CMS_MODULE } from "../../../../modules/cms"
import {
  type UpdateCmsLatestVersionInput,
  updateCmsLatestVersionStep,
} from "../update-cms-latest-version"

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

type MovedLatest = { from: string | null; to: string }

/**
 * Builds the `cms` service, whose document has the given latest version.
 *
 * @param latestId - The id of the version that is latest now.
 * @returns The service.
 */
const createCmsService = (latestId: string) => ({
  listCmsVersions: jest.fn(async () => [{ id: latestId }]),
  updateCmsVersions: jest.fn(async () => undefined),
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
const [invoke, compensate] = updateCmsLatestVersionStep as unknown as [
  (
    input: UpdateCmsLatestVersionInput,
    context: { container: Container }
  ) => Promise<{ compensateInput: MovedLatest | null }>,
  (
    moved: MovedLatest | null | undefined,
    context: { container: Container }
  ) => Promise<void>,
]

const INPUT: UpdateCmsLatestVersionInput = {
  collection: "recipe",
  document_id: "trec_1",
  version_id: "cmsver_3",
}

describe("updateCmsLatestVersionStep", () => {
  it("takes latest from the current version before it gives it to the new one", async () => {
    const service = createCmsService("cmsver_5")

    const response = await invoke(INPUT, { container: containerFor(service) })

    expect(service.updateCmsVersions.mock.calls).toEqual([
      [{ id: "cmsver_5", latest: false }],
      [{ id: "cmsver_3", latest: true }],
    ])
    expect(response.compensateInput).toEqual({
      from: "cmsver_5",
      to: "cmsver_3",
    })
  })

  it("changes nothing when the version is latest already", async () => {
    const service = createCmsService("cmsver_3")

    const response = await invoke(INPUT, { container: containerFor(service) })

    expect(service.updateCmsVersions).not.toHaveBeenCalled()
    expect(response.compensateInput).toBeNull()
  })

  it("moves latest back the same way during compensation", async () => {
    const service = createCmsService("cmsver_3")

    await compensate(
      { from: "cmsver_5", to: "cmsver_3" },
      { container: containerFor(service) }
    )

    expect(service.updateCmsVersions.mock.calls).toEqual([
      [{ id: "cmsver_3", latest: false }],
      [{ id: "cmsver_5", latest: true }],
    ])
  })
})
