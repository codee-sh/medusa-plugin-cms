import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { CMS_MODULE } from "../../modules/cms"
import type CmsModuleService from "../../modules/cms/service"
import { LOG_PREFIX } from "../log-prefix"
import { prepareRegistry } from "./prepare-registry"
import type { Registry } from "./types"

let resolved: { registry: Registry } | { error: Error } | undefined

/**
 * Builds the registry from the config the project passed to the plugin.
 *
 * @param container - The request's or workflow's container.
 * @returns The registry.
 * @throws When the plugin has no config, or the config is invalid.
 */
const resolveRegistry = (container: MedusaContainer): Registry => {
  const config = container.resolve<CmsModuleService>(CMS_MODULE).getConfig()

  if (!config) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "The CMS plugin was registered without a config"
    )
  }

  return prepareRegistry(config)
}

/**
 * Returns the registry, built once per process. A failure is kept too, logged once, so every CMS
 * route answers with the same message.
 *
 * @param container - The request's or workflow's container.
 * @returns The registry.
 * @throws The kept error, when the config is invalid.
 */
export const getRegistry = (container: MedusaContainer): Registry => {
  if (!resolved) {
    try {
      resolved = { registry: resolveRegistry(container) }
    } catch (error) {
      resolved = { error: error as Error }
      container
        .resolve(ContainerRegistrationKeys.LOGGER)
        .error(`${LOG_PREFIX} ${resolved.error.message}`)
    }
  }

  if ("error" in resolved) {
    throw resolved.error
  }

  return resolved.registry
}
