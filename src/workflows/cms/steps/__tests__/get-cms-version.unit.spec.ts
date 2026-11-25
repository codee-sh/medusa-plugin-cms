import { CMS_MODULE } from "../../../../modules/cms"
import { type GetCmsVersionInput, getCmsVersionStep } from "../get-cms-version"
import type { CmsVersionRecord } from "../list-cms-versions"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Runs the step against a `cms` service holding the given versions.
 *
 * @param rows - The versions the list answers.
 * @returns The step's output.
 */
const runStep = async (rows: Partial<CmsVersionRecord>[]) => {
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName === CMS_MODULE) {
        return { listCmsVersions: jest.fn(async () => rows) }
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = getCmsVersionStep as unknown as (
    stepInput: GetCmsVersionInput,
    context: { container: typeof container }
  ) => Promise<{ output: CmsVersionRecord }>

  return (
    await invoke(
      { collection: "recipe", document_id: "trec_1", id: "cmsver_1" },
      { container }
    )
  ).output
}

describe("getCmsVersionStep", () => {
  it("returns the version with its snapshot", async () => {
    const version = { id: "cmsver_1", snapshot: { title: "Soup" } }

    expect(await runStep([version])).toEqual(version)
  })

  it("answers not found for a version of no document or another one", async () => {
    await expect(runStep([])).rejects.toMatchObject({
      type: "not_found",
      message: 'Version "cmsver_1" was not found for document "trec_1"',
    })
  })
})
