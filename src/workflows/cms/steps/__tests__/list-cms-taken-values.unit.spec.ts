import { TEST_CONTENT_MODULE } from "../../../../../integration-tests/modules/test-content"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { Config } from "../../../../lib/config/types"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type CmsTakenValues,
  type ListCmsTakenValuesInput,
  listCmsTakenValuesStep,
} from "../list-cms-taken-values"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Builds the test module's service with its list method.
 *
 * @param rows - The rows the method returns.
 * @returns The service.
 */
const createTestModuleService = (rows: Record<string, unknown>[] = []) => ({
  listTestRecipes: jest.fn(
    async (_filters: Record<string, unknown>, _config: { select: string[] }) =>
      rows
  ),
})

/**
 * Runs the step on the recipe collection.
 *
 * @param document - The submitted values.
 * @param service - The test module's service.
 * @param config - The CMS config; the step is loaded on its own when one is given, because the
 * registry is built once per module load.
 * @param id - The edited document's id.
 * @returns The step's output.
 */
const runStep = async (
  document: Record<string, unknown>,
  service = createTestModuleService(),
  config?: Config,
  id?: string
): Promise<CmsTakenValues> => {
  const dependencies: Record<string, unknown> = {
    [CMS_MODULE]: { getConfig: () => config ?? buildTestConfig() },
    [TEST_CONTENT_MODULE]: service,
  }
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName in dependencies) {
        return dependencies[registrationName]
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  let step = listCmsTakenValuesStep

  if (config) {
    jest.isolateModules(() => {
      step = require("../list-cms-taken-values").listCmsTakenValuesStep
    })
  }

  const invoke = step as unknown as (
    stepInput: ListCmsTakenValuesInput,
    context: { container: typeof container }
  ) => Promise<{ output: CmsTakenValues }>

  return (await invoke({ collection: "recipe", document, id }, { container }))
    .output
}

describe("listCmsTakenValuesStep", () => {
  it("looks up a submitted slug by its value and its suffixed forms", async () => {
    const service = createTestModuleService([{ slug: "soup" }])

    const taken = await runStep({ title: "Soup", slug: "soup" }, service)

    expect(service.listTestRecipes).toHaveBeenCalledWith(
      { $or: [{ slug: "soup" }, { slug: { $like: "soup-%" } }] },
      { select: ["slug"] }
    )
    expect(taken).toEqual({ slug: ["soup"] })
  })

  it("looks up an empty slug by the slug of its source and its suffixes", async () => {
    const service = createTestModuleService()

    await runStep({ title: "Żurek" }, service)

    expect(service.listTestRecipes.mock.calls[0][0]).toEqual({
      $or: [{ slug: "zurek" }, { slug: { $like: "zurek-%" } }],
    })
  })

  it("looks up the slug the field's own transform builds", async () => {
    const config = buildTestConfig()
    config.collections[0].fields!.slug = {
      type: "slug",
      label: "Slug",
      from: "title",
      serverTransform: (text) => `recipe-${text.length}`,
    }
    const service = createTestModuleService()

    await runStep({ title: "Soup" }, service, config)

    expect(service.listTestRecipes.mock.calls[0][0]).toEqual({
      $or: [{ slug: "recipe-4" }, { slug: { $like: "recipe-4-%" } }],
    })
  })

  it("leaves the edited document out of the lookup", async () => {
    const service = createTestModuleService()

    await runStep({ slug: "soup" }, service, undefined, "trec_1")

    expect(service.listTestRecipes.mock.calls[0][0]).toEqual({
      $or: [{ slug: "soup" }, { slug: { $like: "soup-%" } }],
      id: { $ne: "trec_1" },
    })
  })

  it("reads nothing when there is nothing to look up", async () => {
    const service = createTestModuleService()

    const taken = await runStep({ notes: "Simmer" }, service)

    expect(taken).toEqual({})
    expect(service.listTestRecipes).not.toHaveBeenCalled()
  })
})
