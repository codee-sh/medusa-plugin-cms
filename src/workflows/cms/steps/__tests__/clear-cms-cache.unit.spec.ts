import { Modules } from "@medusajs/framework/utils"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { DocumentWrite } from "../../../../lib/document/types"
import { CMS_MODULE } from "../../../../modules/cms"
import { type ClearCmsCacheInput, clearCmsCacheStep } from "../clear-cms-cache"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

type TaggedRows = { rows: { id: string }[] }

/**
 * Builds the Caching Module with the two methods the step calls. `computeTags` answers a tag per row,
 * named after its operation so a test can tell them apart, and the row's list tag, as Medusa's does.
 *
 * @returns The module.
 */
const createCaching = () => ({
  computeTags: jest.fn(
    async ({ rows }: TaggedRows, { operation }: { operation: string }) =>
      rows.flatMap(({ id }) => [`${operation}:${id}`, "Row:list:*"])
  ),
  clear: jest.fn(async (_input: { tags: string[] }) => undefined),
})

/**
 * Runs the step.
 *
 * @param write - The write the workflow made.
 * @param caching - The Caching Module, or `undefined` for an app without one.
 * @returns Nothing; the test reads the module's calls.
 */
const runStep = async (
  write: DocumentWrite,
  caching: ReturnType<typeof createCaching> | undefined
): Promise<void> => {
  const container = {
    resolve: jest.fn(
      (registrationName: string, options?: { allowUnregistered?: boolean }) => {
        if (registrationName === CMS_MODULE) {
          return { getConfig: () => buildTestConfig() }
        }
        if (registrationName === Modules.CACHING) {
          if (!caching && !options?.allowUnregistered) {
            throw new Error("The Caching Module is not registered")
          }
          return caching
        }
        throw new Error(`Unexpected dependency: ${registrationName}`)
      }
    ),
  }
  const invoke = clearCmsCacheStep as unknown as (
    stepInput: ClearCmsCacheInput,
    context: { container: typeof container }
  ) => Promise<unknown>

  await invoke({ collection: "recipe", write }, { container })
}

describe("clearCmsCacheStep", () => {
  it("clears the tags of every row a write touched, by its operation, and the collection's tag", async () => {
    const caching = createCaching()

    await runStep(
      {
        create: [{ key: "TestStep", rows: [{ id: "tstep_new" }] }],
        update: [
          { key: "TestRecipe", rows: [{ id: "trec_1", title: "Soup" }] },
          { key: "TestCallout", rows: [{ id: "tcall_1" }] },
        ],
        delete: [{ key: "TestTip", ids: ["ttip_1"] }],
      },
      caching
    )

    expect(caching.computeTags).toHaveBeenCalledWith(
      { rows: [{ id: "tstep_new" }] },
      { operation: "created" }
    )
    expect(caching.computeTags).toHaveBeenCalledWith(
      { rows: [{ id: "trec_1" }, { id: "tcall_1" }] },
      { operation: "updated" }
    )
    expect(caching.computeTags).toHaveBeenCalledWith(
      { rows: [{ id: "ttip_1" }] },
      { operation: "deleted" }
    )
    expect(caching.clear).toHaveBeenCalledTimes(1)
    expect(caching.clear.mock.calls[0][0].tags.sort()).toEqual(
      [
        "created:tstep_new",
        "updated:trec_1",
        "updated:tcall_1",
        "deleted:ttip_1",
        "Row:list:*",
        "TestRecipe:list:*",
      ].sort()
    )
  })

  it("computes nothing for an operation the write does not make", async () => {
    const caching = createCaching()

    await runStep(
      {
        create: [],
        update: [{ key: "TestRecipe", rows: [{ id: "trec_1" }] }],
        delete: [{ key: "TestTip", ids: [] }],
      },
      caching
    )

    expect(caching.computeTags).toHaveBeenCalledTimes(1)
    expect(caching.computeTags).toHaveBeenCalledWith(expect.anything(), {
      operation: "updated",
    })
  })

  it("does nothing in an app without the Caching Module", async () => {
    await expect(
      runStep(
        {
          create: [],
          update: [{ key: "TestRecipe", rows: [{ id: "trec_1" }] }],
          delete: [],
        },
        undefined
      )
    ).resolves.toBeUndefined()
  })
})
