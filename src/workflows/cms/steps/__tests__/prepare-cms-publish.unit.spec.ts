import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { DocumentWrite } from "../../../../lib/document/types"
import { CMS_MODULE } from "../../../../modules/cms"
import type { CmsDocument } from "../list-cms-documents"
import type { CmsVersionRecord } from "../list-cms-versions"
import {
  type PrepareCmsPublishInput,
  prepareCmsPublishStep,
} from "../prepare-cms-publish"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Builds a rich text document of one paragraph, as a callout's body holds it.
 *
 * @param text - The paragraph's text.
 * @returns The document.
 */
const buildRichText = (text: string) => ({
  root: {
    type: "root",
    children: [{ type: "paragraph", children: [{ type: "text", text }] }],
  },
})

/**
 * Runs the step on a stored recipe.
 *
 * @param status - The recipe's status.
 * @param latest - Its latest version.
 * @param areas - Its areas as `get-cms-document` reads them: the area rows and each area by its name.
 * @returns The step's output.
 */
const runStep = async (
  status: CmsDocument["status"],
  latest?: Partial<CmsVersionRecord>,
  areas: Record<string, unknown> = {}
): Promise<DocumentWrite> => {
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName === CMS_MODULE) {
        return { getConfig: () => buildTestConfig() }
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = prepareCmsPublishStep as unknown as (
    stepInput: PrepareCmsPublishInput,
    context: { container: typeof container }
  ) => Promise<{ output: DocumentWrite }>
  const stored: CmsDocument = {
    id: "trec_1",
    status,
    updated_at: "2026-11-09T10:00:00.000Z",
    title: "Soup",
    ...areas,
  }

  return (
    await invoke(
      {
        collection: "recipe",
        stored,
        latest: latest as CmsVersionRecord | undefined,
      },
      { container }
    )
  ).output
}

describe("prepareCmsPublishStep", () => {
  it("updates a draft's status to published, with the time of the publish", async () => {
    const before = Date.now()

    const write = await runStep("draft")

    expect(write).toEqual({
      create: [],
      delete: [],
      update: [
        {
          key: "TestRecipe",
          rows: [
            {
              id: "trec_1",
              status: "published",
              published_at: expect.any(Date),
            },
          ],
        },
      ],
    })
    expect(
      (write.update[0].rows[0].published_at as Date).getTime()
    ).toBeGreaterThanOrEqual(before)
  })

  it("refuses a document that is already published", async () => {
    await expect(runStep("published")).rejects.toMatchObject({
      type: "not_allowed",
      message: 'Document "trec_1" is already published',
    })
  })

  it("writes the latest draft's content with the status", async () => {
    const write = await runStep("published", {
      status: "draft",
      snapshot: { title: "Bean stew" },
    })

    expect(write.update[0].rows[0]).toEqual({
      id: "trec_1",
      title: "Bean stew",
      status: "published",
      published_at: expect.any(Date),
    })
  })

  it("refuses a published document whose latest version is published too", async () => {
    await expect(
      runStep("published", { status: "published", snapshot: {} })
    ).rejects.toMatchObject({ type: "not_allowed" })
  })

  it("writes the draft's areas: a kept block updated, a new one created, a removed one deleted", async () => {
    const write = await runStep(
      "published",
      {
        status: "draft",
        snapshot: {
          title: "Soup",
          sections: [
            { block_type: "callout", body: buildRichText("New") },
            { id: "tstep_1", block_type: "step", heading: "Chop" },
          ],
        },
      },
      {
        areas: [
          {
            id: "tsec_1",
            name: "sections",
            parent_id: null,
            steps: [
              { id: "tstep_1", heading: "Chop", rank: 0, area_id: "tsec_1" },
              { id: "tstep_2", heading: "Cook", rank: 1, area_id: "tsec_1" },
            ],
            callouts: [],
          },
        ],
        sections: [
          { id: "tstep_1", block_type: "step", heading: "Chop", rank: 0 },
          { id: "tstep_2", block_type: "step", heading: "Cook", rank: 1 },
        ],
      }
    )

    expect(write.create).toEqual([
      {
        key: "TestCallout",
        rows: [
          {
            id: expect.stringMatching(/^tcall_/),
            body: JSON.stringify(buildRichText("New")),
            rank: 0,
            area_id: "tsec_1",
          },
        ],
      },
    ])
    expect(write.update).toEqual([
      {
        key: "TestRecipe",
        rows: [
          {
            id: "trec_1",
            title: "Soup",
            status: "published",
            published_at: expect.any(Date),
          },
        ],
      },
      {
        key: "TestStep",
        rows: [{ id: "tstep_1", heading: "Chop", rank: 1, area_id: "tsec_1" }],
      },
    ])
    expect(write.delete).toEqual([{ key: "TestStep", ids: ["tstep_2"] }])
  })
})
