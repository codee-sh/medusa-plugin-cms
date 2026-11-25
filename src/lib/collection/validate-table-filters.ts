import { buildConfigError } from "../config/build-config-error"
import type { CmsTableConfig, CollectionConfig } from "../config/types"

/** The field types an editor filters a table by. */
const FILTER_FIELD_TYPES = ["select", "boolean"]

/** The parameters a table keeps in the URL, beside its filters under their fields' names. */
const TABLE_PARAMS = ["q", "order", "status", "offset"]

/**
 * Checks the fields a table lets an editor filter by: a list of `select` and `boolean` fields of the
 * collection, each once, none named after a parameter the table keeps in the URL.
 *
 * @param table - The table: the collection's `admin.table`, or a `table` entry's.
 * @param config - The collection's config, with its fields.
 * @param path - Where the config sits, for error messages.
 * @param where - The table's place in it.
 * @throws At the first filter that is no such field, or repeats.
 */
export const validateTableFilters = (
  table: CmsTableConfig,
  config: CollectionConfig,
  path: string,
  where: string
): void => {
  if (table.filters === undefined) {
    return
  }

  // A JS config can give anything here, which the types do not allow.
  if (!Array.isArray(table.filters)) {
    throw buildConfigError(`${path}: ${where} filters needs a list of fields`)
  }

  table.filters.forEach((name, index) => {
    const at = `${path}: ${where} filter [${index}]`
    const field = config.fields?.[name]

    if (!field || !FILTER_FIELD_TYPES.includes(field.type)) {
      throw buildConfigError(
        `${at} "${String(name)}" is no select or boolean field, which an editor filters by`
      )
    }

    if (TABLE_PARAMS.includes(name)) {
      throw buildConfigError(
        `${at} "${name}" shares its name with a parameter of the table, ${TABLE_PARAMS.join(", ")}`
      )
    }

    if (table.filters!.indexOf(name) !== index) {
      throw buildConfigError(`${path}: ${where} filters "${name}" twice`)
    }
  })
}
