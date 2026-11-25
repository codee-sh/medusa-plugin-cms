import { buildConfigError } from "../config/build-config-error"
import type { ModelDescription } from "../model/types"
import type { RegistryAreaLink } from "./types"

/**
 * Tells whether a `CHECK` expression names a column as a whole word.
 *
 * @param expression - The expression.
 * @param column - The column name.
 * @returns Whether the expression names it.
 */
const matchesColumn = (expression: string, column: string): boolean =>
  new RegExp(`\\b${column}\\b`).test(expression)

/**
 * Checks the relations between a model with areas and the area model: the cascade of its `areas`, the
 * area model's nullable `belongsTo` back, and a check naming its owner column.
 *
 * @param model - The model whose records hold the areas.
 * @param areaModel - The area model.
 * @param path - Where the config sits, for error messages.
 * @returns The owner column it matched.
 * @throws At the first relation, cascade or check missing.
 */
export const validateAreaLink = (
  model: ModelDescription,
  areaModel: ModelDescription,
  path: string
): RegistryAreaLink => {
  const owner = areaModel.relations.find(
    ({ type, target }) => type === "belongsTo" && target === model.name
  )

  if (!model.cascades.includes("areas")) {
    throw buildConfigError(`${path}: must cascade its delete to "areas"`)
  }

  if (!owner) {
    throw buildConfigError(
      `area: ${areaModel.name} needs a belongsTo to ${model.name}`
    )
  }

  const ownerColumn = owner.foreignKey!

  if (!owner.nullable) {
    throw buildConfigError(
      `area: the belongsTo "${owner.name}" of ${areaModel.name} must be nullable`
    )
  }

  if (!areaModel.checks.some((check) => matchesColumn(check, ownerColumn))) {
    throw buildConfigError(
      `area: a check of ${areaModel.name} must name its owner column "${ownerColumn}"`
    )
  }

  return { ownerColumn }
}
