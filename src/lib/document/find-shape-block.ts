import type { ShapeBlock } from "./types"

/**
 * Finds a block's type in a document's shape.
 *
 * @param blocks - The shape's block types.
 * @param slug - The block's `block_type`, as a body or a read holds it.
 * @returns The type, or nothing for a slug the shape does not know.
 */
export const findShapeBlock = <Type extends ShapeBlock>(
  blocks: Type[],
  slug: unknown
): Type | undefined => blocks.find((block) => block.slug === slug)
