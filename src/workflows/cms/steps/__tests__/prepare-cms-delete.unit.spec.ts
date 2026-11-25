import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { DocumentWrite } from "../../../../lib/document/types"
import { CMS_MODULE } from "../../../../modules/cms"
import type { CmsDocument } from "../list-cms-documents"
import {
  type PrepareCmsDeleteInput,
  prepareCmsDeleteStep,
} from "../prepare-cms-delete"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

describe("prepareCmsDeleteStep", () => {
  it("soft-deletes the document's row, and creates and updates nothing", async () => {
    const container = {
      resolve: jest.fn((registrationName: string) => {
        if (registrationName === CMS_MODULE) {
          return { getConfig: () => buildTestConfig() }
        }
        throw new Error(`Unexpected dependency: ${registrationName}`)
      }),
    }
    const invoke = prepareCmsDeleteStep as unknown as (
      stepInput: PrepareCmsDeleteInput,
      context: { container: typeof container }
    ) => Promise<{ output: DocumentWrite }>
    const stored = { id: "trec_1", status: "published" } as CmsDocument

    const { output } = await invoke(
      { collection: "recipe", stored },
      { container }
    )

    expect(output).toEqual({
      create: [],
      update: [],
      delete: [{ key: "TestRecipe", ids: ["trec_1"] }],
    })
  })
})
