import type { Config, DmlModel } from "../config/types"
import { buildConfigError } from "../config/build-config-error"
import { describeModel } from "../model/describe-model"
import type { ModelRelation, RelationType } from "../model/types"
import { validateDmlModel } from "../model/validate-dml-model"

const PATH = "area"

/**
 * Finds the relation a model reaches the area model by.
 *
 * @param model - The config's `model`.
 * @param name - The relation's fixed name.
 * @param type - The relation's kind.
 * @param path - Where the config sits, for error messages.
 * @returns The relation.
 * @throws When the model is not a DML model or lacks the relation.
 */
const findAreaRelation = (
  model: DmlModel,
  name: string,
  type: RelationType,
  path: string
): ModelRelation => {
  validateDmlModel(model, path)

  const relation = describeModel(model).relations.find(
    (candidate) => candidate.name === name && candidate.type === type
  )

  if (!relation) {
    throw buildConfigError(
      `${path}: needs an "${name}" ${type} to the area model`
    )
  }

  return relation
}

/**
 * Finds the area model as the target of the `areas` relation of each collection with areas and of the
 * `area` relation of each block type. The config does not name it.
 *
 * @param config - The project's CMS config.
 * @returns The area model, or `undefined` when nothing in the config holds areas or blocks.
 * @throws When a relation is missing, or the relations point at more than one model.
 */
export const findAreaModel = (config: Config): DmlModel | undefined => {
  const relations = [
    ...config.collections
      .filter(({ areas }) => Object.keys(areas ?? {}).length)
      .map(({ slug, model }) =>
        findAreaRelation(model, "areas", "hasMany", `collection "${slug}"`)
      ),
    ...(config.blocks ?? []).map(({ slug, model }) =>
      findAreaRelation(model, "area", "belongsTo", `block "${slug}"`)
    ),
  ]
  const targets = [...new Set(relations.map(({ target }) => target))]

  if (targets.length > 1) {
    throw buildConfigError(
      `${PATH}: the "areas" and "area" relations point at more than one model: ${targets.join(", ")}`
    )
  }

  return relations[0]?.model
}
