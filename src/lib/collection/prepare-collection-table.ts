import type {
  ClientText,
  CmsTableConfig,
  CollectionConfig,
} from "../config/types"
import { prepareTableLabels } from "./prepare-table-labels"

/**
 * Builds the table of a collection that names none: its `useAsTitle` field, or the `id` without one,
 * the status for a collection with drafts, and the last update.
 *
 * @param config - The collection's config.
 * @returns The table.
 */
const buildDefaultTable = (
  config: CollectionConfig
): CmsTableConfig<ClientText> => ({
  columns: [
    config.admin?.useAsTitle
      ? { field: config.admin.useAsTitle }
      : { system: "id" },
    ...(config.drafts === true ? [{ system: "status" as const }] : []),
    { system: "updated_at" },
  ],
})

/**
 * Resolves a collection's documents table: the config's `admin.table`, its labels prepared, or the
 * default; none for a singleton, whose page shows its sections. `validateTableColumns` has checked it.
 *
 * @param config - The collection's config.
 * @param translationNs - The config's `admin.translationNs`, which a label's `t` takes.
 * @param path - Where the config sits, for error messages.
 * @returns The table, or `undefined` for a singleton.
 */
export const prepareCollectionTable = (
  config: CollectionConfig,
  translationNs: string | undefined,
  path: string
): CmsTableConfig<ClientText> | undefined => {
  if (config.singleton) {
    return undefined
  }

  const table = config.admin?.table

  if (!table) {
    return buildDefaultTable(config)
  }

  return prepareTableLabels(table, translationNs, `${path}: admin "table"`)
}
