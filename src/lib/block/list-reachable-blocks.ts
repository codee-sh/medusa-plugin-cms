import type { RegistryArea } from "../area/types"

/**
 * Lists every block type the areas reach: the types they allow and, through each type's areas, the
 * types those allow, at any depth. A type inside itself is listed once.
 *
 * @param areas - The areas to start from.
 * @param blocks - The block types, by slug.
 * @returns The block types, each once, in the order the areas first name them; a slug that is not a
 * known type is left out.
 */
export const listReachableBlocks = <
  Block extends { slug: string; areas: RegistryArea[] },
>(
  areas: RegistryArea[],
  blocks: Record<string, Block>
): Block[] => {
  const reached: Block[] = []
  const pending = areas.flatMap((area) => area.blocks)

  // The loop also reads the slugs it appends, so it goes down every area.
  for (const slug of pending) {
    const block = blocks[slug]

    if (block && !reached.includes(block)) {
      reached.push(block)
      pending.push(...block.areas.flatMap((area) => area.blocks))
    }
  }

  return reached
}
