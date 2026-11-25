import { buildConfigError } from "../config/build-config-error"
import type { BlockConfig, CollectionConfig } from "../config/types"
import type { RegistryField } from "../field/types"
import type { ModelDescription } from "../model/types"

/**
 * Checks a collection's relations against the other collections: each relationship field's
 * `relationTo` a registered collection, not a block, whose model the `belongsTo` points at, and every
 * `belongsTo` the model requires listed as a relationship field, as no write could fill it otherwise.
 *
 * @param model - The collection's model.
 * @param fields - Its fields.
 * @param collections - Every collection's config.
 * @param blocks - Every block type's config, which no relation may point at.
 * @param path - Where the config sits, for error messages.
 * @throws At the first relationship whose target is wrong, or required `belongsTo` with no field.
 */
export const validateRelationshipTargets = (
  model: ModelDescription,
  fields: RegistryField[],
  collections: CollectionConfig[],
  blocks: BlockConfig[],
  path: string
): void => {
  for (const relation of model.relations) {
    if (!relation.foreignKey) {
      continue
    }

    const field = fields.find(({ name }) => name === relation.foreignKey)

    if (!field) {
      if (!relation.nullable) {
        throw buildConfigError(
          `${path}: "${relation.foreignKey}" is required by the relation "${relation.name}", so the config must list it as a relationship field`
        )
      }

      continue
    }

    const where = `${path}: relationship "${field.name}"`

    if (blocks.some(({ slug }) => slug === field.relationTo)) {
      throw buildConfigError(
        `${where} points at the block "${field.relationTo}"; a relation points at a collection`
      )
    }

    const target = collections.find(({ slug }) => slug === field.relationTo)

    if (!target) {
      throw buildConfigError(
        `${where}: "relationTo" "${field.relationTo}" is not a collection`
      )
    }

    if (target.model.parse().name !== relation.target) {
      throw buildConfigError(
        `${where}: "relationTo" "${field.relationTo}" is registered for ${target.model.parse().name}, but the relation "${relation.name}" points at ${relation.target}`
      )
    }
  }
}
