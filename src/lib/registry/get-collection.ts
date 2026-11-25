import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { getRegistry } from "./get-registry"
import type { RegistryCollection } from "../collection/types"

/**
 * Returns a registered collection by its slug.
 *
 * @param container - The request's or workflow's container.
 * @param slug - The collection's slug, as in the URL.
 * @returns The collection and the module whose service holds its model.
 * @throws `NOT_FOUND` for an unknown slug, or the registry's error when the config is invalid.
 */
export const getCollection = (
  container: MedusaContainer,
  slug: string
): { module: string; collection: RegistryCollection } => {
  const registry = getRegistry(container)
  const collection = registry.collections[slug]

  if (!collection) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Collection "${slug}" was not found`
    )
  }

  return { module: registry.module, collection }
}
