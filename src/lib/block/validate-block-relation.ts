import { buildConfigError } from "../config/build-config-error"
import type { ModelDescription } from "../model/types"

/**
 * Checks the area model's `hasMany` to a block type and its cascade; the block's `area` back is checked
 * when the area model is found.
 *
 * @param model - The block's model.
 * @param areaModel - The area model.
 * @returns The area model's relation to the block type.
 * @throws When the relation or its cascade is missing.
 */
export const validateBlockRelation = (
  model: ModelDescription,
  areaModel: ModelDescription
): string => {
  const relation = areaModel.relations.find(
    ({ type, target }) => type === "hasMany" && target === model.name
  )

  if (!relation) {
    throw buildConfigError(
      `area: ${areaModel.name} needs a hasMany to ${model.name}`
    )
  }

  if (!areaModel.cascades.includes(relation.name)) {
    throw buildConfigError(
      `area: ${areaModel.name} must cascade its delete to "${relation.name}"`
    )
  }

  return relation.name
}
