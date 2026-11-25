import { CMS_MODULE } from "../../../../modules/cms"
import {
  type ListCmsVersionsInput,
  type ListCmsVersionsOutput,
  listCmsVersionsStep,
} from "../list-cms-versions"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Runs the step against a `cms` service whose list answers nothing.
 *
 * @param input - The step's input, past the recipe and its document.
 * @returns The service's list method, to assert on.
 */
const runStep = async (input: Partial<ListCmsVersionsInput> = {}) => {
  const listAndCountCmsVersions = jest.fn(async () => [[], 0])
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName === CMS_MODULE) {
        return { listAndCountCmsVersions }
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = listCmsVersionsStep as unknown as (
    stepInput: ListCmsVersionsInput,
    context: { container: typeof container }
  ) => Promise<{ output: ListCmsVersionsOutput }>

  await invoke(
    { collection: "recipe", document_id: "trec_1", ...input },
    { container }
  )

  return listAndCountCmsVersions.mock.calls[0] as unknown as [
    Record<string, unknown>,
    { select: string[]; take?: number; skip?: number },
  ]
}

describe("listCmsVersionsStep", () => {
  it("reads every version of the document newest first, without snapshots", async () => {
    const [filters, config] = await runStep()

    expect(filters).toEqual({ collection: "recipe", document_id: "trec_1" })
    expect(config).toMatchObject({ order: { version: "DESC" } })
    expect(config.select).not.toContain("snapshot")
    expect(config).not.toHaveProperty("take")
  })

  it("reads the latest version with its snapshot", async () => {
    const [filters, config] = await runStep({
      latest: true,
      with_snapshot: true,
    })

    expect(filters).toMatchObject({ latest: true })
    expect(config.select).toContain("snapshot")
  })

  it("reads one page when a limit is given", async () => {
    const [, config] = await runStep({ limit: 20, offset: 40 })

    expect(config).toMatchObject({ take: 20, skip: 40 })
  })
})
