import { buildConfigError } from "../config/build-config-error"
import type {
  CmsTableColumn,
  CmsTableConfig,
  CollectionConfig,
} from "../config/types"
import { validateTableFilters } from "./validate-table-filters"

/** The columns of the plugin's own a table may list. */
const SYSTEM_COLUMNS = [
  "id",
  "status",
  "published_version",
  "created_at",
  "updated_at",
]

/** The system columns the list orders by: the model's columns, which leave `id` and the version out. */
const SORTABLE_SYSTEM_COLUMNS = ["status", "created_at", "updated_at"]

/** The most documents a page of a table shows. */
const PAGE_SIZE_MAX = 100

/**
 * Checks a field a table shows: a field of the collection, a scalar column of the model, and no
 * `richtext` field, whose document a cell cannot show as text.
 *
 * @param name - The field's name.
 * @param where - The config key naming it, for error messages.
 * @param columns - The model's scalar columns.
 * @param config - The collection's config, with its fields.
 * @param path - Where the config sits, for error messages.
 * @throws When the field cannot be shown.
 */
const validateTableField = (
  name: string,
  where: string,
  columns: string[],
  config: CollectionConfig,
  path: string
): void => {
  const field = config.fields?.[name]

  if (!field) {
    throw buildConfigError(`${path}: ${where} "${name}" is not a field`)
  }

  if (!columns.includes(name)) {
    throw buildConfigError(`${path}: ${where} "${name}" is not a scalar column`)
  }

  if (field.type === "richtext") {
    throw buildConfigError(
      `${path}: ${where} "${name}" is a richtext field, whose document the table cannot show as text`
    )
  }
}

/**
 * Names a column by what it shows: its field, or its system column.
 *
 * @param column - The column.
 * @returns The field's or the system column's name.
 */
const describeColumn = (column: CmsTableColumn): string =>
  "field" in column ? column.field : column.system

/**
 * Tells whether a column of a table sorts: a field column unless turned off, or a system column the
 * list orders by.
 *
 * @param column - The column.
 * @returns Whether the table sorts by it.
 */
const isSortableColumn = (column: CmsTableColumn): boolean =>
  "field" in column
    ? column.sortable !== false
    : SORTABLE_SYSTEM_COLUMNS.includes(column.system)

/**
 * Checks the columns of a table: a list of field or system columns, each once.
 *
 * @param table - The table, as the config gave it.
 * @param columns - The model's scalar columns.
 * @param config - The collection's config.
 * @param path - Where the config sits, for error messages.
 * @param where - The table's place in it: `admin "table"`, or a `table` entry's.
 * @throws At the first column that is not one, cannot be shown, or repeats.
 */
const validateColumnList = (
  table: CmsTableConfig,
  columns: string[],
  config: CollectionConfig,
  path: string,
  where: string
): void => {
  // A JS config can give anything here, which the types do not allow.
  if (!Array.isArray(table.columns) || !table.columns.length) {
    throw buildConfigError(`${path}: ${where} needs a list of columns`)
  }

  const shown: string[] = []

  table.columns.forEach((column, index) => {
    const at = `${where} column [${index}]`
    const { field, system } = (column ?? {}) as Record<string, unknown>

    if (typeof field === "string") {
      validateTableField(field, `${at} "field"`, columns, config, path)
    } else if (typeof system !== "string" || !SYSTEM_COLUMNS.includes(system)) {
      throw buildConfigError(
        `${path}: ${at} needs a "field" or a "system" of ${SYSTEM_COLUMNS.join(", ")}`
      )
    }

    const name = describeColumn(column)

    if (shown.includes(name)) {
      throw buildConfigError(`${path}: ${where} shows "${name}" more than once`)
    }

    shown.push(name)
  })
}

/**
 * Checks a table's first order and page size: a sortable column of the table, ascending or descending,
 * and a whole number of documents from 1 to 100.
 *
 * @param table - The table, its columns checked.
 * @param path - Where the config sits, for error messages.
 * @param where - The table's place in it: `admin "table"`, or a `table` entry's.
 * @throws When either does not fit.
 */
const validateSortAndPageSize = (
  table: CmsTableConfig,
  path: string,
  where: string
): void => {
  const { defaultSort, pageSize } = table

  if (defaultSort) {
    const column = table.columns.find(
      (candidate) => describeColumn(candidate) === defaultSort.column
    )

    if (!column || !isSortableColumn(column)) {
      throw buildConfigError(
        `${path}: ${where} defaultSort "${defaultSort.column}" is no sortable column of the table`
      )
    }

    if (!["asc", "desc"].includes(defaultSort.direction)) {
      throw buildConfigError(
        `${path}: ${where} defaultSort needs a direction of asc or desc`
      )
    }
  }

  if (
    pageSize !== undefined &&
    (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > PAGE_SIZE_MAX)
  ) {
    throw buildConfigError(
      `${path}: ${where} pageSize needs a whole number from 1 to ${PAGE_SIZE_MAX}`
    )
  }
}

/**
 * Checks a documents table of a collection: its columns name fields that are scalar columns of the
 * model and no `richtext`, or system columns, each once, its first order and page size fit it, and its
 * filters name fields an editor filters by.
 *
 * @param table - The table: the collection's `admin.table`, or a `table` entry's.
 * @param columns - The model's scalar columns.
 * @param config - The collection's config, with its fields.
 * @param path - Where the config sits, for error messages.
 * @param where - The table's place in it.
 * @throws At the first part of the table that does not fit.
 */
export const validateTable = (
  table: CmsTableConfig,
  columns: string[],
  config: CollectionConfig,
  path: string,
  where: string
): void => {
  validateColumnList(table, columns, config, path, where)
  validateSortAndPageSize(table, path, where)
  validateTableFilters(table, config, path, where)
}

/**
 * Checks what the collection's documents table shows: `useAsTitle` names a field that is a scalar
 * column of the model and no `richtext`, and `admin.table` passes `validateTable`.
 *
 * @param columns - The model's scalar columns.
 * @param config - The collection's config, whose `admin` names the columns.
 * @param path - Where the config sits, for error messages.
 * @throws At the first column that cannot be shown.
 */
export const validateTableColumns = (
  columns: string[],
  config: CollectionConfig,
  path: string
): void => {
  const admin = config.admin ?? {}

  if (admin.useAsTitle) {
    validateTableField(
      admin.useAsTitle,
      'admin "useAsTitle"',
      columns,
      config,
      path
    )
  }

  if (admin.table) {
    validateTable(admin.table, columns, config, path, 'admin "table"')
  }
}
