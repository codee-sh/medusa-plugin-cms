import { CMS_MODULE } from "../../../../modules/cms"
import type { CreateCmsVersionInput } from "../../../../modules/cms/service"
import { createCmsVersionStep } from "../create-cms-version"

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

type CreatedVersion = { id: string; previous_latest_id: string | null }

/**
 * Builds the `cms` service, whose document has the given latest version.
 *
 * @param latestId - The id of the version that is latest now, if any.
 * @returns The service.
 */
const createCmsService = (latestId?: string) => ({
  listCmsVersions: jest.fn(async () => (latestId ? [{ id: latestId }] : [])),
  createCmsVersion: jest.fn(async (input: CreateCmsVersionInput) => ({
    ...input,
    id: "cmsver_new",
    version: 2,
    latest: true,
  })),
  deleteCmsVersions: jest.fn(async () => undefined),
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
const [invoke, compensate] = createCmsVersionStep as unknown as [
  (
    input: CreateCmsVersionInput,
    context: { container: Container }
  ) => Promise<{ compensateInput: CreatedVersion }>,
  (
    created: CreatedVersion | undefined,
    context: { container: Container }
  ) => Promise<void>,
]

const INPUT: CreateCmsVersionInput = {
  collection: "recipe",
  document_id: "trec_1",
  snapshot: { title: "Soup" },
  status: "draft",
  changed_fields: ["title"],
  change_type: "save",
  created_by: "user_1",
}

describe("createCmsVersionStep", () => {
  it("records the version through createCmsVersion, noting the previous latest", async () => {
    const service = createCmsService("cmsver_old")

    const response = await invoke(INPUT, {
      container: containerFor(service),
    })

    expect(service.createCmsVersion).toHaveBeenCalledWith(INPUT)
    expect(response.compensateInput).toEqual({
      id: "cmsver_new",
      previous_latest_id: "cmsver_old",
    })
  })

  it("deletes the new version, then makes the previous one latest again, during compensation", async () => {
    const service = createCmsService()

    await compensate(
      { id: "cmsver_new", previous_latest_id: "cmsver_old" },
      { container: containerFor(service) }
    )

    expect(service.deleteCmsVersions).toHaveBeenCalledWith(["cmsver_new"])
    expect(service.updateCmsVersions).toHaveBeenCalledWith({
      id: "cmsver_old",
      latest: true,
    })
    expect(service.deleteCmsVersions.mock.invocationCallOrder[0]).toBeLessThan(
      service.updateCmsVersions.mock.invocationCallOrder[0]
    )
  })

  it("only deletes the new version when there was no latest before it", async () => {
    const service = createCmsService()

    await compensate(
      { id: "cmsver_new", previous_latest_id: null },
      { container: containerFor(service) }
    )

    expect(service.updateCmsVersions).not.toHaveBeenCalled()
  })
})
