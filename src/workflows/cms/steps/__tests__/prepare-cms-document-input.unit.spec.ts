import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { Config } from "../../../../lib/config/types"
import { CMS_MODULE } from "../../../../modules/cms"
import type { CmsTakenValues } from "../list-cms-taken-values"
import {
  type PrepareCmsDocumentInputInput,
  type PreparedCmsDocument,
  prepareCmsDocumentInputStep,
} from "../prepare-cms-document-input"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Runs the step on the recipe collection, as the admin `user_1`.
 *
 * @param document - The submitted values.
 * @param taken - The unique values live recipes hold.
 * @param config - The CMS config; the step is loaded on its own when one is given, because the
 * registry is built once per module load.
 * @param stored - The stored document, for an edit.
 * @returns The step's output.
 */
const runStep = async (
  document: Record<string, unknown>,
  taken: CmsTakenValues = {},
  config?: Config,
  stored?: Record<string, unknown>
): Promise<PreparedCmsDocument> => {
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName === CMS_MODULE) {
        return { getConfig: () => config ?? buildTestConfig() }
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  let step = prepareCmsDocumentInputStep

  if (config) {
    jest.isolateModules(() => {
      step =
        require("../prepare-cms-document-input").prepareCmsDocumentInputStep
    })
  }

  const invoke = step as unknown as (
    stepInput: PrepareCmsDocumentInputInput,
    context: { container: typeof container }
  ) => Promise<{ output: PreparedCmsDocument }>

  return (
    await invoke(
      { collection: "recipe", actor_id: "user_1", document, taken, stored },
      { container }
    )
  ).output
}

describe("prepareCmsDocumentInputStep", () => {
  it("fills an empty slug from its source", async () => {
    const { values } = await runStep({ title: "Tomato soup", notes: "Simmer" })

    expect(values).toEqual({
      title: "Tomato soup",
      slug: "tomato-soup",
      notes: "Simmer",
    })
  })

  it("adds the first free suffix to a taken slug", async () => {
    const { values } = await runStep(
      { title: "Soup", slug: "" },
      { slug: ["soup", "soup-2", "soup-pie"] }
    )

    expect(values.slug).toBe("soup-3")
  })

  it("builds the slug with the field's own transform", async () => {
    const config = buildTestConfig()
    config.collections[0].fields!.slug = {
      type: "slug",
      label: "Slug",
      from: "title",
      serverTransform: (text) => `recipe-${text.length}`,
    }

    const { values } = await runStep(
      { title: "Soup" },
      { slug: ["recipe-4"] },
      config
    )

    expect(values.slug).toBe("recipe-4-2")
  })

  it("keeps a submitted slug", async () => {
    const { values } = await runStep(
      { title: "Soup", slug: "my-soup" },
      { slug: ["my-soup"] }
    )

    expect(values.slug).toBe("my-soup")
  })

  it("leaves the slug empty when its source gives none", async () => {
    const { values } = await runStep({ title: "!!!" })

    expect(values).not.toHaveProperty("slug")
  })

  it("stamps the actor as author, apart from the values", async () => {
    const prepared = await runStep({ notes: "Simmer" })

    expect(prepared).toEqual({
      values: { notes: "Simmer" },
      areas: {},
      created_by: "user_1",
      updated_by: "user_1",
    })
  })

  it("stamps only the editor on an edit", async () => {
    const prepared = await runStep({ notes: "Simmer" }, {}, undefined, {
      id: "trec_1",
      title: "Soup",
      slug: "soup",
    })

    expect(prepared).toEqual({
      values: { notes: "Simmer" },
      areas: {},
      updated_by: "user_1",
    })
  })

  it("fills a slug sent empty on an edit from the stored source", async () => {
    const { values } = await runStep(
      { slug: null },
      { slug: ["soup"] },
      undefined,
      { id: "trec_1", title: "Soup", slug: "soup" }
    )

    expect(values.slug).toBe("soup-2")
  })

  it("leaves a slug the edit does not send as stored", async () => {
    const { values } = await runStep({ title: "Pie" }, {}, undefined, {
      id: "trec_1",
      title: "Soup",
      slug: "soup",
    })

    expect(values).toEqual({ title: "Pie" })
  })

  it("keeps the areas the body holds apart from the values", async () => {
    const sections = [{ block_type: "step", heading: "Chop" }]

    const prepared = await runStep({ notes: "Simmer", sections })

    expect(prepared.values).toEqual({ notes: "Simmer" })
    expect(prepared.areas).toEqual({ sections })
  })
})
