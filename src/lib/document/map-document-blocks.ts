import type { RegistryArea } from "../area/types"
import { findShapeBlock } from "./find-shape-block"
import { isBlockValue } from "./is-block-value"
import type { BlockPlace, DocumentShape, ShapeBlock } from "./types"

/** Turns one block into what the copy holds in its place, or `null` to leave it out. */
export type MapBlock<Type extends ShapeBlock> = (
  block: Record<string, unknown>,
  place: BlockPlace<Type>
) => Record<string, unknown> | null

/**
 * Rebuilds the given areas of a document or a block, each block mapped after its own areas.
 *
 * @param shape - Where the document holds its blocks.
 * @param holder - The document or the block.
 * @param areas - The holder's areas.
 * @param parent - The block, or `null` for the document.
 * @param prefix - The holder's path with its trailing dot, empty for the document.
 * @param mapBlock - What each block becomes.
 * @returns The areas the holder holds as lists, rebuilt, under their names.
 */
const mapAreas = <Type extends ShapeBlock>(
  shape: DocumentShape<Type>,
  holder: Record<string, unknown>,
  areas: RegistryArea[],
  parent: Record<string, unknown> | null,
  prefix: string,
  mapBlock: MapBlock<Type>
): Record<string, unknown[]> =>
  Object.fromEntries(
    areas.flatMap((area) => {
      const blocks = holder[area.name]

      if (!Array.isArray(blocks)) {
        return []
      }

      const mapped = blocks.flatMap((block: unknown, index) => {
        if (!isBlockValue(block)) {
          return [block]
        }

        const path = `${prefix}${area.name}.${index}`
        const type = findShapeBlock(shape.blocks, block.block_type)
        const result = mapBlock(
          {
            ...block,
            ...mapAreas(
              shape,
              block,
              type?.areas ?? [],
              block,
              `${path}.`,
              mapBlock
            ),
          },
          { path, area, type, parent }
        )

        return result === null ? [] : [result]
      })

      return [[area.name, mapped]]
    })
  )

/**
 * Copies a document with every block at any depth turned into what `mapBlock` makes of it, a stored
 * tree or a body alike. A block's areas are mapped first, so `mapBlock` gets them done and decides
 * whether the block keeps them. The document's own keys are copied as they are, and so is an area or
 * area it leaves out.
 *
 * @param shape - Where the document holds its blocks.
 * @param document - The document, with its areas under their names.
 * @param mapBlock - What each block becomes, given where it sits; `null` leaves it out.
 * @returns The copy.
 */
export const mapDocumentBlocks = <Type extends ShapeBlock>(
  shape: DocumentShape<Type>,
  document: Record<string, unknown>,
  mapBlock: MapBlock<Type>
): Record<string, unknown> => ({
  ...document,
  ...mapAreas(shape, document, shape.areas, null, "", mapBlock),
})
