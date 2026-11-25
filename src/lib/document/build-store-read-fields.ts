import type { Registry } from "../registry/types"
import type { StoreAreaSelection, StoreSelection } from "./types"

/** The columns a block needs to sit in its tree, whatever the store answers of it. */
const BLOCK_PLACE_COLUMNS = ["id", "rank", "area_id"]

/** The columns of an area row the tree is built from. */
const AREA_ROW_FIELDS = ["areas.id", "areas.name", "areas.parent_id"]

/**
 * Gathers, per block type, the fields selected of it in any area.
 *
 * @param selection - An area's selection.
 * @param columns - The fields gathered so far, by block type, which this fills.
 */
const pushBlockColumns = (
  selection: StoreAreaSelection,
  columns: Map<string, Set<string>>
): void => {
  for (const [slug, block] of Object.entries(selection)) {
    const gathered = columns.get(slug) ?? new Set(BLOCK_PLACE_COLUMNS)

    block.fields.forEach((field) => gathered.add(field))
    columns.set(slug, gathered)
    Object.values(block.areas).forEach((areaSelection) =>
      pushBlockColumns(areaSelection, columns)
    )
  }
}

/**
 * Turns what the store answers of a document into the fields `query.graph` reads: the document's
 * columns, the other paths as they are, and, when an area is selected, the area rows and each selected
 * block type's relation with only the columns selected of it, wherever it sits, and those that place it.
 *
 * Every area row of a document points at it, so the rows of a block's area come with the document's; a block
 * type no path names is not read, and its blocks are not in the tree.
 *
 * @param registry - The registry, which names each block type's relation.
 * @param selection - What the store answers.
 * @returns The fields.
 */
export const buildStoreReadFields = (
  registry: Registry,
  selection: StoreSelection
): string[] => {
  const columns = new Map<string, Set<string>>()

  Object.values(selection.areas).forEach((area) =>
    pushBlockColumns(area, columns)
  )

  return [
    ...selection.columns,
    ...selection.paths,
    ...(Object.keys(selection.areas).length ? AREA_ROW_FIELDS : []),
    ...[...columns].flatMap(([slug, fields]) =>
      [...fields].map(
        (field) => `areas.${registry.blocks[slug].relation}.${field}`
      )
    ),
  ]
}
