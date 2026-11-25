import type {
  DocumentBlock,
  StoreAreaSelection,
  StoreBlockSelection,
  StoreSelection,
} from "./types"

/**
 * Copies the given keys a row holds.
 *
 * @param row - The document or the block.
 * @param keys - The keys to keep.
 * @returns The copy.
 */
const pickKeys = (
  row: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> =>
  Object.fromEntries(
    keys.filter((key) => key in row).map((key) => [key, row[key]])
  )

/**
 * Tells whether a `metadata` value holds nothing.
 *
 * @param metadata - The value.
 * @returns Whether it is missing or an object without keys.
 */
const isEmptyMetadata = (metadata: unknown): boolean =>
  metadata === null ||
  metadata === undefined ||
  (typeof metadata === "object" && Object.keys(metadata).length === 0)

/**
 * Keeps the blocks of an area whose type the selection names, each as the selection says, in their order.
 * A block of a type its area no longer allows is left out.
 *
 * @param blocks - The area's blocks.
 * @param selection - What the store answers of the area.
 * @returns The blocks the store answers.
 */
const pickAreaBlocks = (
  blocks: unknown,
  selection: StoreAreaSelection
): Record<string, unknown>[] =>
  ((blocks ?? []) as DocumentBlock[])
    .filter((block) => block.allowed !== false && selection[block.block_type])
    .map((block) => pickBlock(block, selection[block.block_type]))

/**
 * Keeps of a block its `id`, its `block_type`, the fields the selection names and its areas, each
 * picked the same way.
 *
 * @param block - The block.
 * @param selection - What the store answers of its type here.
 * @returns The block the store answers.
 */
const pickBlock = (
  block: DocumentBlock,
  selection: StoreBlockSelection
): Record<string, unknown> => ({
  ...pickKeys(block, ["id", "block_type", ...selection.fields]),
  ...Object.fromEntries(
    Object.entries(selection.areas).map(([name, areaSelection]) => [
      name,
      pickAreaBlocks(block[name], areaSelection),
    ])
  ),
})

/**
 * Turns a published document, read with its areas under their names, into what the store answers: the
 * columns, areas, block types and fields the selection names, and the other paths it hands on, such as a
 * project's own link.
 *
 * It takes the document `buildReadDocument` made, each media field holding its record and each
 * `richtext` field its document. A model's empty `metadata` is `null`. A block keeps its `id` and `block_type` and, of its fields, only the
 * ones selected, so a field with `store: { hidden: true }` is never answered, and neither is the CMS's
 * own bookkeeping - `status`, the authorship, a block's place. A block of a type its area no longer allows
 * is left out, its areas with it.
 *
 * @param document - The document as `get-cms-document` or `list-cms-documents` reads it, through
 * `buildReadDocument`.
 * @param selection - What the store answers, from `buildStoreSelection`.
 * @returns The store's document.
 */
export const buildStoreDocument = (
  document: Record<string, unknown>,
  selection: StoreSelection
): Record<string, unknown> => {
  const answer = {
    ...pickKeys(document, [
      ...selection.columns,
      ...selection.paths.map((path) => path.split(".")[0]),
    ]),
    ...Object.fromEntries(
      Object.entries(selection.areas).map(([name, area]) => [
        name,
        pickAreaBlocks(document[name], area),
      ])
    ),
  }

  return "metadata" in answer && isEmptyMetadata(answer.metadata)
    ? { ...answer, metadata: null }
    : answer
}
