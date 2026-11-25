import { DmlEntity } from "@medusajs/framework/utils"
import { buildConfigError } from "../config/build-config-error"
import type { DmlModel } from "../config/types"

/**
 * Checks that a config's `model` is a DML model, as `model.define()` returns it.
 *
 * Declared as a function, because TypeScript takes an assertion only from a declared signature.
 *
 * @param model - The config's `model`.
 * @param path - Where the config sits, for error messages.
 * @throws When it is not one.
 */
export function validateDmlModel(
  model: unknown,
  path: string
): asserts model is DmlModel {
  if (!DmlEntity.isDmlEntity(model)) {
    throw buildConfigError(`${path}: "model" is not a DML model`)
  }
}
