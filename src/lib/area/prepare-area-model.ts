import { buildConfigError } from "../config/build-config-error"
import { validateColumnTypes } from "../model/validate-column-types"
import { describeModel } from "../model/describe-model"
import type { DmlModel } from "../config/types"
import type { ModelDescription } from "../model/types"
import type { RegistryAreaModel } from "./types"

const PATH = "area"

/** The area's name, which the plugin writes on the area model; `parent_id` is checked apart, as nullable. */
const AREA_COLUMN_TYPES: Record<string, string> = {
  name: "text",
}

/**
 * Checks the area model's `parent_id`, the block or row an area sits in: a nullable text column.
 *
 * @param description - The area model's description.
 * @throws When the column is missing, not text or not nullable.
 */
const validateParentColumn = (description: ModelDescription): void => {
  const parent = description.columns.find(({ name }) => name === "parent_id")

  if (parent?.dataType !== "text" || !parent.nullable) {
    throw buildConfigError(`${PATH}: needs a nullable "parent_id" text column`)
  }
}

/**
 * Describes the area model and checks the columns the plugin writes on it: the area's `name`, and
 * `parent_id`, the block or row an area sits in.
 *
 * Its relations to the collections and the block types are checked with each of them.
 *
 * @param model - The area model, as `findAreaModel` found it.
 * @returns The model's description, for the relation checks, and the area model the registry records.
 * @throws When a column the plugin writes is missing.
 */
export const prepareAreaModel = (
  model: DmlModel
): { description: ModelDescription; area: RegistryAreaModel } => {
  const description = describeModel(model)

  validateColumnTypes(description, AREA_COLUMN_TYPES, PATH)
  validateParentColumn(description)

  return {
    description,
    area: { key: description.name, idPrefix: description.idPrefix ?? "" },
  }
}
