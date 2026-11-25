import type { Config } from "../../config/types"
import { FileMediaProvider } from "../../media-provider/file-media-provider"
import { buildTestConfig } from "../../__tests__/fixtures"

/**
 * Builds a container holding the CMS module.
 *
 * @param config - The config the CMS module returns.
 * @returns The container.
 */
const buildContainer = (config: Config) =>
  ({
    resolve: (name: string) =>
      name === "cms" ? { getConfig: () => config } : undefined,
  }) as never

/**
 * Loads `getMediaProvider` with a registry of its own, as the registry is built once per process.
 *
 * @returns The function.
 */
const loadGetMediaProvider = () => {
  let getMediaProvider: typeof import("../get-media-provider").getMediaProvider

  jest.isolateModules(() => {
    getMediaProvider = require("../get-media-provider").getMediaProvider
  })

  return getMediaProvider!
}

describe("getMediaProvider", () => {
  it("creates the config's provider with the caller's container and the config's options", () => {
    const config = buildTestConfig()
    config.media = {
      provider: { resolve: FileMediaProvider, options: { maxFileSize: 2048 } },
    }
    const container = buildContainer(config)

    const provider = loadGetMediaProvider()(container)

    expect(provider).toBeInstanceOf(FileMediaProvider)
    expect(provider).toMatchObject({
      container,
      options: { maxFileSize: 2048 },
    })
  })

  it("creates a new instance for each caller", () => {
    const container = buildContainer(buildTestConfig())
    const getMediaProvider = loadGetMediaProvider()

    expect(getMediaProvider(container)).not.toBe(getMediaProvider(container))
  })

  it("refuses a config without a media provider", () => {
    const config = buildTestConfig()
    delete config.media
    delete config.collections[0].fields!.cover
    delete config.collections[0].fields!.gallery
    // The media section holds only those two fields, so it goes with them.
    config.collections[0].admin.sections =
      config.collections[0].admin.sections.filter(({ key }) => key !== "media")
    delete config.blocks![1].fields!.image

    expect(() => loadGetMediaProvider()(buildContainer(config))).toThrow(
      expect.objectContaining({
        type: "not_allowed",
        message: "The CMS config names no media provider",
      })
    )
  })
})
