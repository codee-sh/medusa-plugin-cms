import type { Config } from "../../config/types"
import { buildTestConfig } from "../../__tests__/fixtures"

/**
 * Builds a container holding the CMS module and a logger.
 *
 * @param config - The config the CMS module returns.
 * @returns The container and its logger.
 */
const buildContainer = (config?: Config) => {
  const logger = { error: jest.fn() }
  const services: Record<string, unknown> = {
    cms: { getConfig: () => config },
    logger,
  }

  return {
    logger,
    container: { resolve: (name: string) => services[name] } as never,
  }
}

describe("getRegistry", () => {
  it("builds the registry from the config, once per process", () => {
    jest.isolateModules(() => {
      const { getRegistry } = require("../get-registry")
      const { container } = buildContainer(buildTestConfig())

      const registry = getRegistry(container)

      expect(registry.collections.recipe.key).toBe("TestRecipe")
      expect(getRegistry(container)).toBe(registry)
    })
  })

  it("keeps a failure and logs it once", () => {
    jest.isolateModules(() => {
      const { getRegistry } = require("../get-registry")
      const { container, logger } = buildContainer()

      expect(() => getRegistry(container)).toThrow("without a config")
      expect(() => getRegistry(container)).toThrow("without a config")
      expect(logger.error).toHaveBeenCalledTimes(1)
    })
  })
})
