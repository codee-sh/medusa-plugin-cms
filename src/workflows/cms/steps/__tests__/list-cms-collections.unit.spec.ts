import { TEST_CONTENT_MODULE } from "../../../../../integration-tests/modules/test-content"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { Config, LayoutSectionConfig } from "../../../../lib/config/types"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type CmsCollectionWithCount,
  listCmsCollectionsStep,
} from "../list-cms-collections"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Builds the test module's service with its counting method.
 *
 * @param count - The number of recipes the method reports.
 * @returns The service.
 */
const createTestModuleService = (count: number) => ({
  listAndCountTestRecipes: jest.fn(async () => [[{ id: "trec_1" }], count]),
  listAndCountTestTags: jest.fn(async () => [[], 0]),
  listAndCountTestSettings: jest.fn(async () => [[], 0]),
  listAndCountTestSettingsLinks: jest.fn(async () => [[], 0]),
})

/**
 * Runs the step with a container holding the CMS module and the test module.
 *
 * The registry is built once per process, so a config other than the test config needs the step
 * loaded afresh, with a registry of its own.
 *
 * @param service - The test module's service.
 * @param config - The config the CMS module holds; the test config when left out.
 * @returns The step's output.
 */
const runStep = async (
  service: ReturnType<typeof createTestModuleService>,
  config?: Config
): Promise<CmsCollectionWithCount[]> => {
  let step = listCmsCollectionsStep

  if (config) {
    jest.isolateModules(() => {
      step = require("../list-cms-collections").listCmsCollectionsStep
    })
  }

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
  const invoke = step as unknown as (
    input: void,
    context: { container: typeof container }
  ) => Promise<{ output: CmsCollectionWithCount[] }>

  return (await invoke(undefined, { container })).output
}

describe("listCmsCollectionsStep", () => {
  it("returns each collection with its document count", async () => {
    const [recipe] = await runStep(createTestModuleService(3))

    expect(recipe).toMatchObject({
      slug: "recipe",
      labels: { singular: "Recipe", plural: "Recipes" },
      drafts: true,
      singleton: false,
      store: true,
      admin: {
        useAsTitle: "title",
        edit: "page",
        table: {
          columns: [
            { field: "title" },
            { system: "status" },
            { system: "updated_at" },
          ],
        },
      },
      count: 3,
    })
    expect(recipe.fields.map(({ name }) => name)).toContain("title")
  })

  it("leaves the service key and the area link out of the projection", async () => {
    const [recipe] = await runStep(createTestModuleService(0))

    expect(recipe).not.toHaveProperty("key")
    expect(recipe).not.toHaveProperty("areaLink")
  })

  it("returns each collection's areas with the slugs of their block types", async () => {
    const [recipe] = await runStep(createTestModuleService(0))

    expect(recipe.areas).toEqual([
      { name: "sections", label: "Sections", blocks: ["step", "callout"] },
    ])
  })

  it("describes each block type its areas reach with its fields, areas and sections, without its key, relation and functions", async () => {
    const [recipe] = await runStep(createTestModuleService(0))

    expect(recipe.blocks).toEqual([
      expect.objectContaining({
        slug: "step",
        labels: { singular: "Step", plural: "Steps" },
        areas: [{ name: "tips", label: "Tips", blocks: ["tip", "step"] }],
        admin: { sections: [] },
      }),
      expect.objectContaining({ slug: "callout", areas: [] }),
      // Reached only through the step's area.
      expect.objectContaining({ slug: "tip" }),
    ])
    expect(recipe.blocks[0].fields.map(({ name }) => name)).toEqual(["heading"])
    expect(recipe.blocks[0]).not.toHaveProperty("key")
    expect(recipe.blocks[0]).not.toHaveProperty("relation")
    expect(recipe.blocks[0]).not.toHaveProperty("slugTransforms")
    expect(recipe.blocks[0]).not.toHaveProperty("validation")
    expect(recipe.blocks[0]).not.toHaveProperty("areaColumn")
  })

  it("describes a block type once when several areas allow it", async () => {
    const config = buildTestConfig()
    config.collections[0].areas!.extras = {
      label: "Extras",
      blocks: ["callout", "step"],
    }
    ;(
      config.collections[0].admin.sections.find(
        ({ key }) => key === "content"
      ) as LayoutSectionConfig
    ).areas!.push("extras")

    const [recipe] = await runStep(createTestModuleService(0), config)

    expect(recipe.areas.map(({ name }) => name)).toEqual(["sections", "extras"])
    expect(recipe.blocks.map(({ slug }) => slug)).toEqual([
      "step",
      "callout",
      "tip",
    ])
  })

  it("carries how deep the areas may nest", async () => {
    const config = buildTestConfig()
    config.maxDepth = 2

    const [recipe] = await runStep(createTestModuleService(0), config)

    expect(recipe.maxDepth).toBe(2)
  })

  it("carries a relationship's kind, its target and the hook that draws it", async () => {
    const config = buildTestConfig()
    const settingsConfig = config.collections.find(
      ({ slug }) => slug === "settings"
    )!
    settingsConfig.fields!.featured_recipe_id = {
      type: "relationship",
      relationTo: "recipe",
      label: "Featured recipe",
      options: { hook: "recipes" },
    }

    const collections = await runStep(createTestModuleService(0), config)
    const settings = collections.find(({ slug }) => slug === "settings")!

    expect(
      settings.fields.find(({ name }) => name === "featured_recipe_id")
    ).toMatchObject({
      kind: "relationship",
      relationTo: "recipe",
      options: { hook: "recipes" },
    })
  })

  it("counts through the generated method, reading one id", async () => {
    const service = createTestModuleService(0)

    await runStep(service)

    expect(service.listAndCountTestRecipes).toHaveBeenCalledWith(
      {},
      { take: 1, select: ["id"] }
    )
  })
})
