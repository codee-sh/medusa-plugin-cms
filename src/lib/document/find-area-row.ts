import type { DocumentAreaRow } from "./types"

/**
 * Finds an area row of a document by its name and what holds it: a document's own area, or a
 * area of one of its blocks.
 *
 * @param rows - The document's area rows.
 * @param name - The area's name.
 * @param parentId - The id of the block holding the area; `null`, the default, for the document's
 * own area.
 * @returns The row, or nothing when the area has none yet.
 */
export const findAreaRow = <
  Row extends Pick<DocumentAreaRow, "name" | "parent_id">,
>(
  rows: Row[],
  name: string,
  parentId: string | null = null
): Row | undefined =>
  rows.find((row) => row.name === name && row.parent_id === parentId)
