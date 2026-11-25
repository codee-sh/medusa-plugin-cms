import { buildConfigError } from "../config/build-config-error"
import type {
  ClientText,
  CmsTableConfig,
  CollectionConfig,
} from "../config/types"
import type { PreparedCollection } from "../collection/types"
import { prepareTableLabels } from "../collection/prepare-table-labels"
import { validateTable } from "../collection/validate-table-columns"

/** What resolving a list entry's table reads beside the entry's settings. */
export type EntryTableContext = {
  /** Every collection, by slug. */
  collections: Record<string, PreparedCollection>
  /** Every collection's config, which the entry's table is checked against. */
  configs: CollectionConfig[]
  /** The config's `admin.translationNs`, which a column label's `t` takes. */
  translationNs: string | undefined
}

/**
 * Puts a list entry's settings over a table: each of `columns`, `defaultSort`, `pageSize` and
 * `filters` the entry gives in place of the table's.
 *
 * @param base - The shown collection's table.
 * @param settings - The entry's settings.
 * @returns The table.
 */
const mergeSectionTable = <TText>(
  base: CmsTableConfig<TText>,
  { columns, defaultSort, pageSize, filters }: Partial<CmsTableConfig<TText>>
): CmsTableConfig<TText> => ({
  ...base,
  ...(columns !== undefined && { columns }),
  ...(defaultSort !== undefined && { defaultSort }),
  ...(pageSize !== undefined && { pageSize }),
  ...(filters !== undefined && { filters }),
})

/**
 * Resolves the table of a list on a route: it names a registered collection that is no singleton, and
 * its table - the collection's own with the entry's settings in place - passes that collection's table
 * checks.
 *
 * @param collection - The slug of the collection the table shows.
 * @param settings - The `columns`, `defaultSort`, `pageSize` and `filters` given, as the config wrote
 * them.
 * @param where - The table's place, for error messages.
 * @param context - The collections, their configs and the namespace.
 * @returns The table, its column labels prepared.
 * @throws When it names no collection or a singleton, or its table does not fit.
 */
export const prepareEntryTable = (
  collection: string,
  settings: Partial<CmsTableConfig>,
  where: string,
  { collections, configs, translationNs }: EntryTableContext
): CmsTableConfig<ClientText> => {
  const target = collections[collection]
  const targetConfig = configs.find(({ slug }) => slug === collection)

  if (!target || !targetConfig) {
    throw buildConfigError(
      `${where} "collection" "${collection}" is not a collection`
    )
  }

  // Every collection but a singleton has a table.
  if (!target.admin.table) {
    throw buildConfigError(
      `${where} cannot show the singleton "${target.slug}", which has no table`
    )
  }

  // The checks read no label, so the resolved table stands in for the config's.
  validateTable(
    mergeSectionTable(target.admin.table as CmsTableConfig, settings),
    target.columns,
    targetConfig,
    where,
    "table"
  )

  return mergeSectionTable(target.admin.table, {
    columns:
      settings.columns &&
      prepareTableLabels(
        { columns: settings.columns },
        translationNs,
        `${where} table`
      ).columns,
    defaultSort: settings.defaultSort,
    pageSize: settings.pageSize,
    filters: settings.filters,
  })
}
