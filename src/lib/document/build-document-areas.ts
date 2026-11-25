import type { RegistryArea } from "../area/types"
import type { RegistryCollection } from "../collection/types"
import type { Registry } from "../registry/types"
import { findAreaRow } from "./find-area-row"
import type { DocumentAreaRow, DocumentAreas, DocumentBlock } from "./types"

/** A block's row as the read returns it. */
type StoredBlockRow = {
  id: string
  rank: number
  [column: string]: unknown
}

/**
 * Gathers an area row's blocks across the configured block types, each with its type.
 *
 * @param registry - The resolved registry.
 * @param row - The area's row, with the block rows under their relations.
 * @returns The blocks in `rank` order; ties fall back to the id, so the order is stable.
 */
const listAreaRowBlocks = (
  registry: Registry,
  row: DocumentAreaRow
): DocumentBlock[] =>
  Object.values(registry.blocks)
    .flatMap(({ slug, relation }) =>
      ((row[relation] ?? []) as StoredBlockRow[]).map((block) => ({
        ...block,
        block_type: slug,
      }))
    )
    .sort(
      (first, second) =>
        first.rank - second.rank || first.id.localeCompare(second.id)
    )

/**
 * Builds the blocks of one area: ordered, typed, a block its area no longer allows marked
 * `allowed: false`, and each block with its type's areas under their names, read from the area rows
 * whose `parent_id` is its id, down to `maxDepth`.
 *
 * @param registry - The resolved registry.
 * @param rows - Every area row of the document.
 * @param area - The area.
 * @param row - Its row, or nothing when it has none yet.
 * @param level - Its level: a document's own areas are level 1.
 * @returns The blocks in order.
 */
const buildAreaBlocks = (
  registry: Registry,
  rows: DocumentAreaRow[],
  area: RegistryArea,
  row: DocumentAreaRow | undefined,
  level: number
): DocumentBlock[] =>
  (row ? listAreaRowBlocks(registry, row) : []).map((block) => {
    // A level past maxDepth is never written, so a deeper row is not read either.
    const blockAreas =
      level < registry.maxDepth ? registry.blocks[block.block_type].areas : []
    const built: DocumentBlock = {
      ...block,
      ...Object.fromEntries(
        blockAreas.map((blockArea) => [
          blockArea.name,
          buildAreaBlocks(
            registry,
            rows,
            blockArea,
            findAreaRow(rows, blockArea.name, block.id),
            level + 1
          ),
        ])
      ),
    }

    return area.blocks.includes(block.block_type)
      ? built
      : { ...built, allowed: false }
  })

/**
 * Turns a document as `query.graph` reads it into its areas as the API serves them: each area of the
 * collection under its name, an empty one as `[]`, with its blocks ordered by `rank` across block types,
 * and under each block its type's areas, built the same way at any depth down to `maxDepth`.
 *
 * An area of the document is its row without a `parent_id`; a block's area is the row of that name
 * whose `parent_id` is the block's id. A block whose type is configured but no longer in its area's or
 * area's list is stale, and is marked `allowed: false`.
 *
 * @param registry - The resolved registry.
 * @param collection - The document's collection.
 * @param document - The document, with every area row of it under `areas`, nested ones included.
 * @returns The document's areas.
 */
export const buildDocumentAreas = (
  registry: Registry,
  collection: RegistryCollection,
  document: Record<string, unknown>
): DocumentAreas => {
  const rows = (document.areas ?? []) as DocumentAreaRow[]

  return Object.fromEntries(
    collection.areas.map((area) => [
      area.name,
      buildAreaBlocks(registry, rows, area, findAreaRow(rows, area.name), 1),
    ])
  )
}
