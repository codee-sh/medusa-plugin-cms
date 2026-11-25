import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { DocumentWrite } from "../../../../lib/document/types"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type PrepareCmsWriteInput,
  prepareCmsWriteStep,
} from "../prepare-cms-write"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Runs the step on a prepared recipe.
 *
 * @param input - The prepared document, for an edit the stored one, and a collection other than the
 * recipes; a new recipe by `user_1` by default.
 * @returns The step's output.
 */
const runStep = async (
  input: Omit<PrepareCmsWriteInput, "collection"> & { collection?: string } = {
    document: {
      values: { title: "Soup", notes: "Simmer" },
      areas: {},
      created_by: "user_1",
      updated_by: "user_1",
    },
  }
): Promise<DocumentWrite> => {
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName === CMS_MODULE) {
        return { getConfig: () => buildTestConfig() }
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = prepareCmsWriteStep as unknown as (
    stepInput: PrepareCmsWriteInput,
    context: { container: typeof container }
  ) => Promise<{ output: DocumentWrite }>

  return (await invoke({ collection: "recipe", ...input }, { container }))
    .output
}

describe("prepareCmsWriteStep", () => {
  it("creates the document's row with its values and authorship", async () => {
    const write = await runStep()

    expect(write).toEqual({
      create: [
        {
          key: "TestRecipe",
          rows: [
            {
              id: expect.stringMatching(/^trec_/),
              title: "Soup",
              notes: "Simmer",
              created_by: "user_1",
              updated_by: "user_1",
            },
          ],
        },
      ],
      update: [],
      delete: [],
    })
  })

  it("leaves the status to the column's default", async () => {
    const [row] = (await runStep()).create[0].rows

    expect(row).not.toHaveProperty("status")
  })

  it("publishes a new document of a collection without drafts", async () => {
    const [row] = (
      await runStep({
        collection: "tag",
        document: {
          values: { name: "Spicy", description: "Hot" },
          areas: {},
          created_by: "user_1",
          updated_by: "user_1",
        },
      })
    ).create[0].rows

    expect(row).toMatchObject({
      id: expect.stringMatching(/^ttag_/),
      status: "published",
      published_at: expect.any(Date),
    })
  })

  it("publishes a draft row of a collection without drafts at its next save", async () => {
    const [row] = (
      await runStep({
        collection: "tag",
        document: { values: { name: "Mild" }, areas: {}, updated_by: "user_1" },
        stored: { id: "ttag_1", name: "Spicy", status: "draft" },
      })
    ).update[0].rows

    expect(row).toMatchObject({
      id: "ttag_1",
      name: "Mild",
      status: "published",
      published_at: expect.any(Date),
    })
  })

  it("keeps a published document's status and publish time without drafts", async () => {
    const [row] = (
      await runStep({
        collection: "tag",
        document: { values: { name: "Mild" }, areas: {}, updated_by: "user_1" },
        stored: { id: "ttag_1", name: "Spicy", status: "published" },
      })
    ).update[0].rows

    expect(row).not.toHaveProperty("status")
    expect(row).not.toHaveProperty("published_at")
  })

  it("updates an edited document's values and editor, and creates nothing", async () => {
    const write = await runStep({
      stored: { id: "trec_1", title: "Soup", notes: "Simmer" },
      document: { values: { notes: null }, areas: {}, updated_by: "user_2" },
    })

    expect(write).toEqual({
      create: [],
      update: [
        {
          key: "TestRecipe",
          rows: [{ id: "trec_1", notes: null, updated_by: "user_2" }],
        },
      ],
      delete: [],
    })
  })
})
