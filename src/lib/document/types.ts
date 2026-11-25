import type { RegistryArea } from "../area/types"
import type { ModelSchemas, RegistryField } from "../field/types"
import type { CmsMedia, CmsMediaStore } from "../media-provider/types"

/** One problem of a document, at its dot path (`sections.2.title`); an empty path is a general error. */
export type DocumentError = { path: string; message: string }

/** `shape` checks every write; `publish` also requires the fields a publish needs. */
export type DocumentSchemaMode = "shape" | "publish"

/** How `buildDocumentSchema` checks a document. */
export type DocumentSchemaOptions = {
  /** `shape` for every write, `publish` for a published document. */
  mode: DocumentSchemaMode
  /**
   * The body is checked before the server fills each empty field that has a `from` column, so such a
   * field is not required yet; the server checks it again once filled.
   */
  beforeFill?: boolean
  /**
   * The body of an edit, which leaves out the fields it does not change, so a required field is checked
   * only when the body holds its key; the server checks the whole document again.
   */
  partial?: boolean
  /**
   * The collection's schemas: each field's and its own `serverValidation` and `serverPublishValidation`. Only the
   * server has them; the Admin leaves them out, checks a field's word, and asks the server to validate
   * the rest.
   */
  schemas?: ModelSchemas
  /** Per block type, by its slug, its schemas, as `schemas` holds the collection's. */
  blockSchemas?: Record<string, ModelSchemas>
}

/** A block as a document read returns it: its columns, `rank` and `area_id` included, and its type. */
export type DocumentBlock = {
  id: string
  /** The block type's slug. */
  block_type: string
  /** Set on a block whose type its area no longer allows, which only the Admin reads. */
  allowed?: false
  [column: string]: unknown
}

/** A document's areas, each under its name, with its blocks in order. */
export type DocumentAreas = Record<string, DocumentBlock[]>

/** An area model's row as the read returns it, with each block type's rows under its relation. */
export type DocumentAreaRow = {
  id: string
  name: string
  parent_id: string | null
  [relation: string]: unknown
}

/**
 * A block as a body sends it: the values of its fields, and its id when it is stored. A stale block is
 * sent as `{ id, block_type }` only.
 */
export type SubmittedBlock = {
  id?: string
  /** The block type's slug. */
  block_type: string
  [column: string]: unknown
}

/** What a save submits: the document's own values, its authorship and the areas the body holds. */
export type DocumentSubmission = {
  values: Record<string, unknown>
  /** Set for a new document only; an edit keeps the stored author. */
  created_by?: string
  /** Left out by a write that keeps the stored editor, as a publish does. */
  updated_by?: string
  /** Each area the body holds, under its name; an area left out is kept as stored. */
  areas?: Record<string, SubmittedBlock[]>
}

/** Ids per model, each model named after its service key. */
export type RowIds = { key: string; ids: string[] }[]

/** The calls a save makes, grouped by model and named after its service key. */
export type DocumentWrite = {
  /** Parents first: the document, then the area rows, then the blocks. */
  create: { key: string; rows: Record<string, unknown>[] }[]
  update: { key: string; rows: Record<string, unknown>[] }[]
  /** Soft deletes. */
  delete: RowIds
}

/** A block type as a walk over a document needs it: its slug and its areas. */
export type ShapeBlock = {
  slug: string
  areas: RegistryArea[]
}

/**
 * Where a document holds its blocks: its own areas, and each block type with its areas. A
 * collection with the registry's blocks fits it on the server, and the Admin's projection as it is.
 */
export type DocumentShape<Type extends ShapeBlock = ShapeBlock> = {
  areas: RegistryArea[]
  blocks: Type[]
}

/** Where a block sits in a document. */
export type BlockPlace<Type extends ShapeBlock = ShapeBlock> = {
  /** The block's dot path: `sections.4.items.0`. */
  path: string
  /** The area that holds it. */
  area: RegistryArea
  /** Its type, when the shape knows it. */
  type: Type | undefined
  /** The block whose area holds it; `null` in a document's own area. */
  parent: Record<string, unknown> | null
}

/** A block of a document, with where it sits. */
export type PlacedBlock<Type extends ShapeBlock = ShapeBlock> =
  BlockPlace<Type> & {
    block: Record<string, unknown>
  }

/**
 * A block type as a read sees it: where its areas are, its media fields and its `richtext` fields.
 */
export type ReadShapeBlock = ShapeBlock & {
  /** Its media fields. */
  mediaFields: RegistryField[]
  /** Its `richtext` fields, whose stored JSON a read parses. */
  richTextFields: RegistryField[]
}

/**
 * Where a collection's documents hold what a read turns: the collection's media and `richtext` fields,
 * and the shape of its documents with each block type's. Plain data, as it travels between steps.
 */
export type ReadPlacement = DocumentShape<ReadShapeBlock> & {
  /** The collection's media fields. */
  mediaFields: RegistryField[]
  /** The collection's `richtext` fields. */
  richTextFields: RegistryField[]
}

/** What the store answers of one block type in one area: its fields and its areas. */
export type StoreBlockSelection = {
  fields: string[]
  areas: Record<string, StoreAreaSelection>
}

/** What the store answers of one area: each block type it keeps, by slug. */
export type StoreAreaSelection = Record<string, StoreBlockSelection>

/** What the store answers of a document, as the fields Medusa resolved name it. */
export type StoreSelection = {
  /** The document's own columns, `id` always among them. */
  columns: string[]
  /** Each area named, by name. */
  areas: Record<string, StoreAreaSelection>
  /** Every other path, read as it is: one a project opened with `allowFields`, such as its own link. */
  paths: string[]
}

/** The records a read found, by what the fields store. */
export type MediaRecords = Record<CmsMediaStore, CmsMedia[]>

/** What a read of media hands on: where the documents hold media, and the records found. */
export type MediaRead = {
  placement: ReadPlacement
  records: MediaRecords
}
