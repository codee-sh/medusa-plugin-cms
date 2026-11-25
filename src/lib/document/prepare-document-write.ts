import { generateEntityId, MedusaError } from "@medusajs/framework/utils"
import type { RegistryField } from "../field/types"
import type { RegistryArea } from "../area/types"
import type { RegistryBlock } from "../block/types"
import type { RegistryCollection } from "../collection/types"
import type { Registry } from "../registry/types"
import { buildDocumentShape } from "./build-document-shape"
import { findAreaRow } from "./find-area-row"
import { normalizeRichText } from "./normalize-rich-text"
import { listDocumentBlocks } from "./list-document-blocks"
import type {
  DocumentAreaRow,
  DocumentSubmission,
  DocumentWrite,
  PlacedBlock,
  SubmittedBlock,
} from "./types"

type RowCalls = DocumentWrite["create"]

/** How one submitted block is written: created, or updated in place. */
type BlockRowWrite = {
  action: "create" | "update"
  key: string
  row: Record<string, unknown>
}

/**
 * Adds a model's call to the calls of one kind when the model has none yet, or finds the one it has.
 *
 * @param calls - The calls of one kind.
 * @param key - The model's service key.
 * @param open - Builds the model's empty call.
 * @returns The model's call.
 */
const addCall = <Call extends { key: string }>(
  calls: Call[],
  key: string,
  open: () => Call
): Call => {
  const found = calls.find((entry) => entry.key === key)

  if (found) {
    return found
  }

  const call = open()

  calls.push(call)

  return call
}

/**
 * Adds a row to the call of its model, opening the call when the model has none yet.
 *
 * @param calls - The calls of one kind.
 * @param key - The model's service key.
 * @param row - The row to write.
 */
const pushRow = (
  calls: RowCalls,
  key: string,
  row: Record<string, unknown>
): void => {
  addCall(calls, key, () => ({ key, rows: [] })).rows.push(row)
}

/**
 * Adds an id to the delete call of its model, opening the call when the model has none yet.
 *
 * @param calls - The delete calls.
 * @param key - The model's service key.
 * @param id - The id to soft-delete.
 */
const pushDeletedId = (
  calls: DocumentWrite["delete"],
  key: string,
  id: string
): void => {
  addCall(calls, key, () => ({ key, ids: [] })).ids.push(id)
}

/**
 * Turns a `richtext` value into what its column stores: the document's JSON, or `null` for a document
 * without text.
 *
 * @param value - The submitted document, or nothing.
 * @returns The column's value.
 */
const formatStoredRichText = (value: unknown): string | null => {
  const document = normalizeRichText(value)

  return document && JSON.stringify(document)
}

/**
 * Turns submitted values into the columns' values: each `richtext` value into its JSON, the rest as
 * they are.
 *
 * @param fields - The model's fields.
 * @param values - The submitted values, by field name.
 * @returns The columns' values.
 */
const prepareStoredValues = (
  fields: RegistryField[],
  values: Record<string, unknown>
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      name,
      fields.some((field) => field.name === name && field.kind === "richtext")
        ? formatStoredRichText(value)
        : value,
    ])
  )

/**
 * Builds the document's own row: a new one with its authorship, or an edit with its editor, when the
 * submission names one.
 *
 * @param collection - The document's collection.
 * @param documentId - The document's id.
 * @param stored - The document as read before the save, or nothing for a new one.
 * @param submitted - What the save submits.
 * @returns The row.
 */
const prepareDocumentRow = (
  collection: RegistryCollection,
  documentId: string,
  stored: Record<string, unknown> | undefined,
  submitted: DocumentSubmission
): Record<string, unknown> => {
  const { created_by, updated_by } = submitted
  const values = prepareStoredValues(collection.fields, submitted.values)

  if (stored) {
    return updated_by === undefined
      ? { id: documentId, ...values }
      : { id: documentId, ...values, updated_by }
  }

  return { id: documentId, ...values, created_by, updated_by }
}

/** What writing a document's areas needs at every depth, and what it collects on the way. */
type AreasWrite = {
  registry: Registry
  documentId: string
  /** The area model's column holding the document's id. */
  ownerColumn: string
  storedRows: DocumentAreaRow[]
  /** Every stored block of the document at any depth, by id. */
  storedBlocks: Map<string, PlacedBlock<RegistryBlock>>
  write: DocumentWrite
  /** The blocks to create, which come after every area row. */
  blockCreates: RowCalls
  /** The ids of the stored blocks the body carries, wherever it moved them. */
  keptIds: Set<string>
  /** Each area the body replaces, as `<holding block's id>:<name>`, an empty id for the document. */
  replaced: Set<string>
}

/**
 * Names an area by what holds it, so the same area of two blocks is told apart.
 *
 * @param parentId - The id of the block holding the area, or `null` for a document's own area.
 * @param name - The area's name.
 * @returns The key.
 */
const formatAreaKey = (parentId: string | null, name: string): string =>
  `${parentId ?? ""}:${name}`

/**
 * Decides how one submitted block's row is written. A block whose id and type match a stored block of
 * the document, at any depth, is updated with its values, its position as `rank` and its area; a stale
 * one, which carries no values, with its `rank` only, and keeps its area: `validate-cms-document` lets
 * a stale block through only where it is stored, so the area it is submitted in is its own. Any other
 * block is new, with an id from its model's prefix, so a changed type makes a new block. Its areas
 * are no columns, and are left out.
 *
 * @param context - The write so far, with the stored blocks.
 * @param area - The area the block is submitted in.
 * @param areaId - The id of that area's row.
 * @param block - The submitted block.
 * @param rank - The block's position in its area.
 * @returns The call the block needs.
 */
const prepareBlockRow = (
  { registry, storedBlocks }: AreasWrite,
  area: RegistryArea,
  areaId: string,
  block: SubmittedBlock,
  rank: number
): BlockRowWrite => {
  const { id, block_type, ...columns } = block
  const { key, idPrefix, areas, fields } = registry.blocks[block_type]
  const values = prepareStoredValues(
    fields,
    Object.fromEntries(
      Object.entries(columns).filter(
        ([name]) => !areas.some((blockArea) => blockArea.name === name)
      )
    )
  )
  const known = id === undefined ? undefined : storedBlocks.get(id)

  if (known?.block.block_type !== block_type) {
    return {
      action: "create",
      key,
      row: {
        id: generateEntityId(undefined, idPrefix),
        ...values,
        rank,
        area_id: areaId,
      },
    }
  }

  if (!area.blocks.includes(block_type)) {
    return { action: "update", key, row: { id, rank } }
  }

  return {
    action: "update",
    key,
    row: { id, ...values, rank, area_id: areaId },
  }
}

/**
 * Writes one area the body holds: its row created when none is stored for that holder and
 * name, and each block created or updated, then each block's areas the body holds, a level deeper.
 *
 * @param context - The write so far.
 * @param area - The area.
 * @param parentId - The id of the block holding the area, or `null` for a document's own area.
 * @param blocks - The blocks the body holds in it.
 */
const pushAreaWrite = (
  context: AreasWrite,
  area: RegistryArea,
  parentId: string | null,
  blocks: SubmittedBlock[]
): void => {
  const { registry, write } = context
  const areaModel = registry.area!
  let areaId = findAreaRow(context.storedRows, area.name, parentId)?.id

  context.replaced.add(formatAreaKey(parentId, area.name))

  if (!areaId) {
    areaId = generateEntityId(undefined, areaModel.idPrefix)
    pushRow(write.create, areaModel.key, {
      id: areaId,
      name: area.name,
      parent_id: parentId,
      [context.ownerColumn]: context.documentId,
    })
  }

  for (const [rank, block] of blocks.entries()) {
    const { action, key, row } = prepareBlockRow(
      context,
      area,
      areaId,
      block,
      rank
    )
    const blockId = row.id as string

    if (action === "update") {
      context.keptIds.add(blockId)
    }

    pushRow(action === "create" ? context.blockCreates : write.update, key, row)

    for (const blockArea of registry.blocks[block.block_type].areas) {
      const held = block[blockArea.name]

      if (Array.isArray(held)) {
        pushAreaWrite(context, blockArea, blockId, held as SubmittedBlock[])
      }
    }
  }
}

/**
 * Adds to the delete calls each stored block the save removes, with everything it held: a block of an
 * area the body replaced that the body no longer carries, and every block under a removed
 * one, then the area rows of the removed blocks' areas. A block the body moved elsewhere stays, with
 * what it holds. One pass is enough, as a block is listed before the blocks of its areas; area rows
 * come last, so their cascade finds no block still live to soft-delete twice.
 *
 * @param context - The write, with the kept blocks and the replaced areas.
 * @param stored - The document's stored blocks, in the order `listDocumentBlocks` lists them.
 */
const pushRemovedBlockDeletes = (
  context: AreasWrite,
  stored: PlacedBlock<RegistryBlock>[]
): void => {
  const { registry, write, keptIds, replaced } = context
  const removedIds = new Set<string>()

  for (const { block, area, parent, type } of stored) {
    const id = block.id as string
    const parentId = (parent?.id as string | undefined) ?? null
    const removed =
      !keptIds.has(id) &&
      (replaced.has(formatAreaKey(parentId, area.name)) ||
        (parentId !== null && removedIds.has(parentId)))

    if (removed && type) {
      removedIds.add(id)
      pushDeletedId(write.delete, type.key, id)
    }
  }

  for (const row of context.storedRows) {
    if (row.parent_id !== null && removedIds.has(row.parent_id)) {
      pushDeletedId(write.delete, registry.area!.key, row.id)
    }
  }
}

/**
 * Adds to the write what the areas the body holds need, at any depth: each area's row
 * created when none is stored, each block created or updated, and each stored block the save removes
 * deleted with what it held. Area rows come before the blocks in the creates, so every parent is written
 * first; a block's area row needs only its block's id, which a new block has before it is written.
 *
 * @param registry - The resolved registry.
 * @param collection - The document's collection.
 * @param documentId - The document's id.
 * @param stored - The document as read before the save, or nothing for a new one.
 * @param submitted - Each area the body holds, under its name.
 * @param write - The write to add the calls to.
 * @throws `UNEXPECTED_STATE` when the collection reaches no area model.
 */
const pushAreasWrite = (
  registry: Registry,
  collection: RegistryCollection,
  documentId: string,
  stored: Record<string, unknown> | undefined,
  submitted: Record<string, SubmittedBlock[]>,
  write: DocumentWrite
): void => {
  const areas = collection.areas.filter(({ name }) => submitted[name])
  const ownerColumn = collection.areaLink?.ownerColumn

  if (!areas.length) {
    return
  }

  if (!registry.area || !ownerColumn) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Collection "${collection.slug}" has areas but no area model`
    )
  }

  const storedList = listDocumentBlocks(
    buildDocumentShape(registry, collection),
    stored ?? {}
  )
  const context: AreasWrite = {
    registry,
    documentId,
    ownerColumn,
    storedRows: (stored?.areas ?? []) as DocumentAreaRow[],
    storedBlocks: new Map(
      storedList.map((placed) => [placed.block.id as string, placed])
    ),
    write,
    blockCreates: [],
    keptIds: new Set(),
    replaced: new Set(),
  }

  for (const area of areas) {
    pushAreaWrite(context, area, null, submitted[area.name])
  }

  write.create.push(...context.blockCreates)
  pushRemovedBlockDeletes(context, storedList)
}

/**
 * Decides what a save writes, by comparing the ids of the stored document with those of the body; values
 * are never compared. The document's row is created, or updated with the values the body holds, a
 * `richtext` document as its JSON and an empty one as `null`, in its blocks too. For each
 * area and, at any depth, each block's area the body holds, its content is replaced: a block whose id
 * is stored anywhere in the document is updated, one without a known id is created, and a stored block
 * the save removes is soft-deleted with everything its areas held. An area the body
 * leaves out is kept as stored.
 *
 * @param registry - The resolved registry.
 * @param collection - The document's collection.
 * @param documentId - The document's id, generated by the caller for a new document.
 * @param stored - The document as `get-cms-document` reads it, or nothing for a new one.
 * @param submitted - What the save submits.
 * @returns The calls, grouped by model; the creates parents first.
 */
export const prepareDocumentWrite = (
  registry: Registry,
  collection: RegistryCollection,
  documentId: string,
  stored: Record<string, unknown> | undefined,
  submitted: DocumentSubmission
): DocumentWrite => {
  const write: DocumentWrite = { create: [], update: [], delete: [] }

  pushRow(
    stored ? write.update : write.create,
    collection.key,
    prepareDocumentRow(collection, documentId, stored, submitted)
  )

  if (submitted.areas) {
    pushAreasWrite(
      registry,
      collection,
      documentId,
      stored,
      submitted.areas,
      write
    )
  }

  return write
}
