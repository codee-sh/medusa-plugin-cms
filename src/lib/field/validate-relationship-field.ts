import { buildConfigError } from "../config/build-config-error"
import type { FieldConfig } from "../config/types"
import type { ModelDescription } from "../model/types"

/**
 * Checks that a field sits on a `belongsTo`'s foreign key exactly when it is a relationship, and that a
 * relationship names the collection it points at. Whether that collection is the relation's target is
 * checked once every collection is known.
 *
 * @param model - The field's model.
 * @param name - The field's name.
 * @param override - The field's config.
 * @param path - Where the config sits, for error messages.
 * @throws When a relationship is on no foreign key or names no collection, or another field type is on
 * a foreign key.
 */
export const validateRelationshipField = (
  model: ModelDescription,
  name: string,
  override: FieldConfig,
  path: string
): void => {
  const relation = model.relations.find(({ foreignKey }) => foreignKey === name)

  if (override.type !== "relationship") {
    if (relation) {
      throw buildConfigError(
        `${path}: "${name}" is the key of the relation "${relation.name}", so its field must be a relationship`
      )
    }

    return
  }

  if (!relation) {
    throw buildConfigError(
      `${path}: relationship "${name}" must sit on the foreign key of a belongsTo`
    )
  }

  if (typeof override.relationTo !== "string" || !override.relationTo.trim()) {
    throw buildConfigError(
      `${path}: relationship "${name}" needs the collection it points at, its "relationTo"`
    )
  }
}
