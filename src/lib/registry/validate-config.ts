import type { Config } from "../config/types"
import { prepareRegistry } from "./prepare-registry"

/**
 * Checks a project's CMS config against its models, so a host project's test fails on a broken config
 * instead of its deploy.
 *
 * @param config - The project's CMS config.
 * @throws At the first problem found, as the plugin reports it at start.
 */
export const validateConfig = (config: Config): void => {
  prepareRegistry(config)
}
