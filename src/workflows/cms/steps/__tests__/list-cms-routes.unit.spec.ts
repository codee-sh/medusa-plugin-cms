import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { RegistryRoute } from "../../../../lib/registry/types"
import { CMS_MODULE } from "../../../../modules/cms"
import { listCmsRoutesStep } from "../list-cms-routes"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Runs the step with a container holding the CMS module and the test config.
 *
 * @returns The step's output.
 */
const runStep = async (): Promise<RegistryRoute[]> => {
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName === CMS_MODULE) {
        return { getConfig: () => buildTestConfig() }
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = listCmsRoutesStep as unknown as (
    input: void,
    context: { container: typeof container }
  ) => Promise<{ output: RegistryRoute[] }>

  return (await invoke(undefined, { container })).output
}

describe("listCmsRoutesStep", () => {
  it("answers the test config's routes in the tree's order, each named and with its collections, the links beside the settings", async () => {
    const routes = await runStep()

    expect(
      routes.map(({ slug, label, collections, parent, children }) => ({
        slug,
        label,
        collections: collections.map(({ collection }) => collection),
        parent,
        children,
      }))
    ).toEqual([
      {
        slug: "recipe",
        label: "Recipes",
        collections: ["recipe"],
        parent: undefined,
        children: [],
      },
      {
        slug: "tag",
        label: "Tags",
        collections: ["tag"],
        parent: undefined,
        children: [],
      },
      {
        slug: "settings",
        label: "Settings",
        collections: ["settings", "settings_link"],
        parent: undefined,
        children: [],
      },
    ])
  })
})
