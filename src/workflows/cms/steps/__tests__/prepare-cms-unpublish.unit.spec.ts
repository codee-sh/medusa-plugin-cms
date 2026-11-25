import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { DocumentWrite } from "../../../../lib/document/types"
import { CMS_MODULE } from "../../../../modules/cms"
import type { CmsDocument } from "../list-cms-documents"
import {
  type PrepareCmsUnpublishInput,
  prepareCmsUnpublishStep,
} from "../prepare-cms-unpublish"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Runs the step on a stored recipe.
 *
 * @param status - The recipe's status.
 * @returns The step's output.
 */
const runStep = async (
  status: CmsDocument["status"]
): Promise<DocumentWrite> => {
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName === CMS_MODULE) {
        return { getConfig: () => buildTestConfig() }
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = prepareCmsUnpublishStep as unknown as (
    stepInput: PrepareCmsUnpublishInput,
    context: { container: typeof container }
  ) => Promise<{ output: DocumentWrite }>
  const stored: CmsDocument = {
    id: "trec_1",
    status,
    updated_at: "2026-11-09T10:00:00.000Z",
    title: "Soup",
  }

  return (await invoke({ collection: "recipe", stored }, { container })).output
}

describe("prepareCmsUnpublishStep", () => {
  it("updates a published document back to a draft, its publish time cleared", async () => {
    expect(await runStep("published")).toEqual({
      create: [],
      delete: [],
      update: [
        {
          key: "TestRecipe",
          rows: [{ id: "trec_1", status: "draft", published_at: null }],
        },
      ],
    })
  })

  it("refuses a document that is not published", async () => {
    await expect(runStep("draft")).rejects.toMatchObject({
      type: "not_allowed",
      message: 'Document "trec_1" is not published',
    })
  })
})
