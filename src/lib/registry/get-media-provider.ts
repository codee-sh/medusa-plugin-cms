import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import type { AbstractCmsMediaProvider } from "../media-provider/abstract-media-provider"
import { getRegistry } from "./get-registry"

/**
 * Creates the config's media provider with the caller's container. The registry keeps the class, not
 * an instance: a provider reaches other modules through its container, as a step does, so each step
 * that calls one creates it with its own.
 *
 * @param container - The step's container.
 * @returns The provider.
 * @throws `NOT_ALLOWED` when the config names no media provider, or the registry's error when the
 * config is invalid.
 */
export const getMediaProvider = (
  container: MedusaContainer
): AbstractCmsMediaProvider => {
  const { media } = getRegistry(container)

  if (!media) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "The CMS config names no media provider"
    )
  }

  return new media.resolve(container, media.options)
}
