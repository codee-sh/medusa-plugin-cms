import { prepareCmsText } from "../config/prepare-cms-text"
import type {
  ClientText,
  CmsTableColumn,
  CmsTableConfig,
} from "../config/types"

/**
 * Prepares a column's label, when it has one.
 *
 * @param column - The column, as the config gave it.
 * @param translationNs - The config's `admin.translationNs`, which the label's `t` takes.
 * @param where - Where the column sits, for error messages.
 * @returns The column, its label prepared.
 */
const prepareColumnLabel = (
  column: CmsTableColumn,
  translationNs: string | undefined,
  where: string
): CmsTableColumn<ClientText> =>
  column.label === undefined
    ? (column as CmsTableColumn<ClientText>)
    : { ...column, label: prepareCmsText(column.label, translationNs, where) }

/**
 * Prepares the labels of a table's columns, which `validateTable` has checked.
 *
 * @param table - The table: a collection's `admin.table`, or a `table` entry's.
 * @param translationNs - The config's `admin.translationNs`, which a label's `t` takes.
 * @param where - The table's place, for error messages: `collection "page": admin "table"`.
 * @returns The table, its labels prepared.
 */
export const prepareTableLabels = (
  table: CmsTableConfig,
  translationNs: string | undefined,
  where: string
): CmsTableConfig<ClientText> => ({
  ...table,
  columns: table.columns.map((column, index) =>
    prepareColumnLabel(
      column,
      translationNs,
      `${where} column [${index}] label`
    )
  ),
})
