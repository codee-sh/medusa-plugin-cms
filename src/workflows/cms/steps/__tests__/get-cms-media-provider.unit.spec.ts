import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { Config } from "../../../../lib/config/types"
import type { ClientMediaProvider } from "../../../../lib/media/types"
import { CMS_MODULE } from "../../../../modules/cms"
import { getCmsMediaProviderStep } from "../get-cms-media-provider"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Runs the step with a container holding the CMS module.
 *
 * The registry is built once per process, so a config other than the test config needs the step
 * loaded afresh, with a registry of its own.
 *
 * @param config - The config the CMS module holds; the test config when left out.
 * @returns The step's output.
 */
const runStep = async (config?: Config): Promise<ClientMediaProvider> => {
  let step = getCmsMediaProviderStep

  if (config) {
    jest.isolateModules(() => {
      step = require("../get-cms-media-provider").getCmsMediaProviderStep
    })
  }

  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName === CMS_MODULE) {
        return { getConfig: () => config ?? buildTestConfig() }
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = step as unknown as (
    input: void,
    context: { container: typeof container }
  ) => Promise<{ output: ClientMediaProvider }>

  return (await invoke(undefined, { container })).output
}

describe("getCmsMediaProviderStep", () => {
  it("tells whether the provider can be searched, and its upload limit", async () => {
    await expect(runStep()).resolves.toEqual({
      searchable: false,
      maxFileSize: 10 * 1024 * 1024,
    })
  })

  it("takes the upload limit from the provider's options", async () => {
    const config = buildTestConfig()
    config.media!.provider.options = { maxFileSize: 2048 }

    await expect(runStep(config)).resolves.toEqual({
      searchable: false,
      maxFileSize: 2048,
    })
  })

  it("answers null for a config without a provider", async () => {
    const config = buildTestConfig()
    delete config.media
    delete config.collections[0].fields!.cover
    delete config.collections[0].fields!.gallery
    // The media section holds only those two fields, so it goes with them.
    config.collections[0].admin.sections =
      config.collections[0].admin.sections.filter(({ key }) => key !== "media")
    delete config.blocks![1].fields!.image

    await expect(runStep(config)).resolves.toBeNull()
  })
})
