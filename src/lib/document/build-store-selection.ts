import type { RegistryArea } from "../area/types"
import type { RegistryBlock } from "../block/types"
import { listPublicFields } from "../field/list-public-fields"
import type { RegistryCollection } from "../collection/types"
import type { Registry } from "../registry/types"
import type {
  StoreAreaSelection,
  StoreBlockSelection,
  StoreSelection,
} from "./types"

/**
 * Finds a block type an area allows.
 *
 * @param registry - The registry.
 * @param area - The area.
 * @param slug - The block type's slug.
 * @returns The block type, or `undefined` when the area does not allow it.
 */
const findAllowedBlock = (
  registry: Registry,
  area: RegistryArea,
  slug: string
): RegistryBlock | undefined =>
  area.blocks.includes(slug) ? registry.blocks[slug] : undefined

/**
 * Gets the selection of a block type in an area, adding an empty one.
 *
 * @param selection - The area's selection.
 * @param slug - The block type's slug.
 * @returns The block type's selection.
 */
const addBlockSelection = (
  selection: StoreAreaSelection,
  slug: string
): StoreBlockSelection => {
  selection[slug] ??= { fields: [], areas: {} }
  return selection[slug]
}

/**
 * Selects a whole area: every block type it allows, each whole.
 *
 * @param registry - The registry.
 * @param selection - The area's selection, which this fills.
 * @param area - The area.
 * @param level - Its level: a document's own areas are 1.
 */
const pushWholeArea = (
  registry: Registry,
  selection: StoreAreaSelection,
  area: RegistryArea,
  level: number
): void => {
  for (const slug of area.blocks) {
    const block = registry.blocks[slug]

    if (block) {
      pushWholeBlock(registry, addBlockSelection(selection, slug), block, level)
    }
  }
}

/**
 * Selects a whole block type: its public fields, and its areas whole while the depth allows.
 *
 * @param registry - The registry.
 * @param selection - The block type's selection, which this fills.
 * @param block - The block type.
 * @param level - The level of the area holding it.
 */
const pushWholeBlock = (
  registry: Registry,
  selection: StoreBlockSelection,
  block: RegistryBlock,
  level: number
): void => {
  selection.fields = [
    ...new Set([...selection.fields, ...listPublicFields(block.fields)]),
  ]

  if (level < registry.maxDepth) {
    for (const blockArea of block.areas) {
      selection.areas[blockArea.name] ??= {}
      pushWholeArea(
        registry,
        selection.areas[blockArea.name],
        blockArea,
        level + 1
      )
    }
  }
}

/**
 * Adds the path below an area to its selection: nothing selects it whole, a block type selects that
 * type whole, a type and a field selects the field, a type and one of its areas goes on in that area. A
 * segment the area does not allow is left out, as Medusa's `allowed` already left it out.
 *
 * @param registry - The registry.
 * @param selection - The area's selection, which this fills.
 * @param area - The area.
 * @param segments - The path's segments below the area.
 * @param level - The area's level: a document's own areas are 1.
 */
const pushAreaPath = (
  registry: Registry,
  selection: StoreAreaSelection,
  area: RegistryArea,
  segments: string[],
  level: number
): void => {
  const [slug, next, ...rest] = segments

  if (slug === undefined) {
    pushWholeArea(registry, selection, area, level)
    return
  }

  const block = findAllowedBlock(registry, area, slug)

  if (!block) {
    return
  }

  const blockSelection = addBlockSelection(selection, slug)

  if (next === undefined) {
    pushWholeBlock(registry, blockSelection, block, level)
    return
  }

  const blockArea = block.areas.find(({ name }) => name === next)

  if (blockArea && level < registry.maxDepth) {
    blockSelection.areas[next] ??= {}
    pushAreaPath(
      registry,
      blockSelection.areas[next],
      blockArea,
      rest,
      level + 1
    )
  } else if (!rest.length && listPublicFields(block.fields).includes(next)) {
    blockSelection.fields = [...new Set([...blockSelection.fields, next])]
  }
}

/**
 * Turns the fields Medusa resolved for a store request - its `req.queryConfig.fields`, after `allowed`
 * - into what the store answers: the document's columns, each area named with the block types and
 * fields named in it, through a block's areas, and the other paths, such as a project's own link.
 *
 * An area's path names the area, the block type and the field: `sections` or `sections.*` the whole area,
 * `sections.hero` or `sections.hero.*` its hero blocks whole, `sections.hero.title` one field, and
 * `sections.grid.items.grid_item.title` a field inside a block's area (main spec D20). A whole area or type
 * is every public field and every area, down to `maxDepth`, so a hidden field is never in it. A
 * column is one of the collection's `storeColumns`, the list `allowed` starts from too; `id` is always
 * one.
 *
 * @param registry - The registry.
 * @param collection - The document's collection.
 * @param fields - The resolved fields.
 * @returns The selection.
 */
export const buildStoreSelection = (
  registry: Registry,
  collection: Pick<RegistryCollection, "fields" | "areas" | "storeColumns">,
  fields: string[]
): StoreSelection => {
  const columns = new Set(collection.storeColumns)
  const fieldNames = new Set(collection.fields.map(({ name }) => name))
  const selection: StoreSelection = { columns: ["id"], areas: {}, paths: [] }

  for (const field of fields) {
    const segments = field.replace(/\.\*$/, "").split(".")
    const area = collection.areas.find(({ name }) => name === segments[0])

    if (area) {
      selection.areas[area.name] ??= {}
      pushAreaPath(
        registry,
        selection.areas[area.name],
        area,
        segments.slice(1),
        1
      )
    } else if (segments.length === 1 && columns.has(segments[0])) {
      selection.columns = [...new Set([...selection.columns, segments[0]])]
    } else if (!fieldNames.has(segments[0])) {
      // A hidden field is no path to hand on, even when code of the project names it.
      selection.paths.push(field)
    }
  }

  return selection
}
