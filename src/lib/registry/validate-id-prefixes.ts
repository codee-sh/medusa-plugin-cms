import { buildConfigError } from "../config/build-config-error"
import type { RegistryAreaModel } from "../area/types"
import type { RegistryBlock } from "../block/types"
import type { RegistryCollection } from "../collection/types"

/**
 * Checks that every registered model has an id prefix, and that no two share one, since the write
 * generates ids by prefix.
 *
 * @param area - The area model, `undefined` for a config without one.
 * @param collections - The collections built so far.
 * @param blocks - The block types built so far.
 * @throws At the first model without a prefix, or with one another model uses.
 */
export const validateIdPrefixes = (
  area: RegistryAreaModel | undefined,
  collections: Record<string, RegistryCollection>,
  blocks: Record<string, RegistryBlock>
): void => {
  const models = [
    ...(area ? [{ path: "area", ...area }] : []),
    ...Object.values(collections).map(({ slug, key, idPrefix }) => ({
      path: `collection "${slug}"`,
      key,
      idPrefix,
    })),
    ...Object.values(blocks).map(({ slug, key, idPrefix }) => ({
      path: `block "${slug}"`,
      key,
      idPrefix,
    })),
  ]
  const pathByPrefix = new Map<string, string>()

  for (const { path, key, idPrefix } of models) {
    const existing = pathByPrefix.get(idPrefix)

    if (!idPrefix) {
      throw buildConfigError(`${path}: the id of ${key} needs a prefix`)
    }

    if (existing) {
      throw buildConfigError(
        `${path}: id prefix "${idPrefix}" is already used by ${existing}`
      )
    }

    pathByPrefix.set(idPrefix, path)
  }
}
