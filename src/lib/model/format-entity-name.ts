import { camelToSnakeCase } from "@medusajs/framework/utils"

/**
 * Names a module's model as Query and a linkable key name it: in snake_case, `TestRecipe` as
 * `test_recipe`.
 *
 * @param key - The model's service key.
 * @returns The entity name.
 */
export const formatEntityName = (key: string): string =>
  camelToSnakeCase(key).toLowerCase()
