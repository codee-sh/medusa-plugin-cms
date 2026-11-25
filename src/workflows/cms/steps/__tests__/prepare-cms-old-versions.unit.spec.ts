import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import { CMS_MODULE } from "../../../../modules/cms"
import type { CmsVersionRecord } from "../list-cms-versions"
import {
  type PrepareCmsOldVersionsInput,
  prepareCmsOldVersionsStep,
} from "../prepare-cms-old-versions"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Builds a document's versions, newest first.
 *
 * @param statuses - Each version's status, newest first; the newest is the latest.
 * @returns The versions, numbered down from their count.
 */
const versionsOf = (statuses: CmsVersionRecord["status"][]) =>
  statuses.map(
    (status, index) =>
      ({
        id: `cmsver_${statuses.length - index}`,
        version: statuses.length - index,
        status,
        latest: index === 0,
      }) as CmsVersionRecord
  )

/**
 * Runs the step with a version limit.
 *
 * @param versions - The document's versions, newest first.
 * @param max - The config's limit; the default when left out.
 * @returns The ids the step picks.
 */
const runStep = async (versions: CmsVersionRecord[], max?: number) => {
  const config = buildTestConfig()

  if (max !== undefined) {
    config.versions = { maxPerDocument: max }
  }

  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName === CMS_MODULE) {
        return { getConfig: () => config }
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = prepareCmsOldVersionsStep as unknown as (
    stepInput: PrepareCmsOldVersionsInput,
    context: { container: typeof container }
  ) => Promise<{ output: string[] }>

  return (await invoke({ versions }, { container })).output
}

describe("prepareCmsOldVersionsStep", () => {
  it("keeps every version within the limit", async () => {
    expect(await runStep(versionsOf(["draft", "published", "draft"]))).toEqual(
      []
    )
  })

  it("picks the oldest over the limit, never the latest published", async () => {
    const versions = versionsOf([
      "draft",
      "draft",
      "draft",
      "published",
      "draft",
    ])

    expect(await runStep(versions, 2)).toEqual(["cmsver_3", "cmsver_1"])
  })
})
