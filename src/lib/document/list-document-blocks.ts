import type { RegistryArea } from "../area/types"
import { findShapeBlock } from "./find-shape-block"
import { isBlockValue } from "./is-block-value"
import type { DocumentShape, PlacedBlock, ShapeBlock } from "./types"

/**
 * Lists the blocks the given areas of a document or a block hold, each followed by the blocks of its
 * own areas.
 *
 * @param shape - Where the document holds its blocks.
 * @param holder - The document or the block.
 * @param areas - The holder's areas.
 * @param parent - The block, or `null` for the document.
 * @param prefix - The holder's path with its trailing dot, empty for the document.
 * @returns The blocks with their places.
 */
const listAreaBlocks = <Type extends ShapeBlock>(
  shape: DocumentShape<Type>,
  holder: Record<string, unknown>,
  areas: RegistryArea[],
  parent: Record<string, unknown> | null,
  prefix: string
): PlacedBlock<Type>[] =>
  areas.flatMap((area) => {
    const blocks = holder[area.name]

    if (!Array.isArray(blocks)) {
      return []
    }

    return blocks.flatMap((block: unknown, index) => {
      if (!isBlockValue(block)) {
        return []
      }

      const path = `${prefix}${area.name}.${index}`
      const type = findShapeBlock(shape.blocks, block.block_type)

      return [
        { block, path, area, type, parent },
        ...listAreaBlocks(shape, block, type?.areas ?? [], block, `${path}.`),
      ]
    })
  })

/**
 * Lists every block of a document at any depth - a stored tree or a body alike - with where it sits:
 * its path, the area that holds it, its type and the block holding that area. A block
 * comes before the blocks of its areas. An area the document leaves out lists nothing,
 * and so does a block whose type the shape does not know.
 *
 * @param shape - Where the document holds its blocks.
 * @param document - The document, with its areas under their names.
 * @returns The blocks, in the document's order.
 */
export const listDocumentBlocks = <Type extends ShapeBlock>(
  shape: DocumentShape<Type>,
  document: Record<string, unknown>
): PlacedBlock<Type>[] => listAreaBlocks(shape, document, shape.areas, null, "")
