import type { BaseEntity, QueryConfig } from "@medusajs/framework/types"
import type { z } from "@medusajs/framework/zod"
import type { RegistryArea, RegistryAreaLink } from "../area/types"
import type { ClientBlock, RegistryBlock } from "../block/types"
import type {
  ClientText,
  CmsTableConfig,
  CollectionAction,
  Labels,
} from "../config/types"
import type {
  PreparedFields,
  RegistryField,
  RegistryLayoutSection,
} from "../field/types"

/**
 * What the Admin is told about a collection: what its table and form show and check, with every block
 * type its areas reach, at any depth, and how deep they may nest. The server answers its texts
 * as `ClientText`; a screen reads them as strings, which is the default.
 */
export type ClientCollection<TText = string> = Pick<
  RegistryCollection<TText>,
  | "slug"
  | "idPrefix"
  | "labels"
  | "drafts"
  | "singleton"
  | "store"
  | "admin"
  | "columns"
  | "unique"
  | "fields"
  | "areas"
> & {
  blocks: ClientBlock<TText>[]
  /** How many levels of areas a document can nest: its own areas are level 1. */
  maxDepth: number
}

/** Where the Admin's routes place a collection. */
export type RegistryCollectionPlace<TText = ClientText> = {
  /** The slug of the collection's route, which its page and its documents' pages stand at. */
  route: string
  /** The buttons of the table's header, resolved from the node's children and the config's `actions`. */
  actions: CollectionAction<TText>[]
}

/** A collection the plugin writes through its module's service, placed in the Admin's routes. */
export type RegistryCollection<TText = ClientText> =
  PreparedCollection<TText> & {
    admin: RegistryCollectionPlace<TText>
  }

/**
 * A collection as `prepareCollection` builds it, before the Admin's routes place it: what the
 * plugin writes through its module's service, whose methods are named after `key`.
 */
export type PreparedCollection<TText = ClientText> = PreparedFields<TText> & {
  key: string
  slug: string
  /** The prefix of the model's ids, unique across every registered model. */
  idPrefix: string
  labels: Labels<TText>
  /** Whether documents have drafts and versions; without, a save is live at once. */
  drafts: boolean
  /** Whether the collection holds at most one document, which cannot be deleted. */
  singleton: boolean
  store: boolean
  admin: {
    useAsTitle?: string
    /** The documents table, the default filled in; none for a singleton. */
    table?: CmsTableConfig<TText>
    /** Where a row is edited, `"page"` when left out; none for a singleton. */
    edit?: "page" | "drawer"
    description?: TText
    /** The form's sections, with their position filled in. */
    sections: RegistryLayoutSection<TText>[]
  }
  /** The model's scalar columns, system and CMS ones included: what a list shows and orders by. */
  columns: string[]
  /** The columns a unique index covers alone, which a write must keep free among live documents. */
  unique: string[]
  areas: RegistryArea<TText>[]
  /** How the documents reach their areas; only for a collection with areas. */
  areaLink?: RegistryAreaLink
  /**
   * The document's columns the store answers, from `listStoreColumns`: what `storeQuery` allows and what
   * a store read selects start from it.
   */
  storeColumns: string[]
  /** What the collection's store routes hand to Medusa's `validateAndTransformQuery`. */
  storeQuery: StoreQuery
  /** The schema of the Admin list's `filters`, from `prepareAdminListFilters`. */
  adminListFilters: z.ZodType
}

/** A store route's query: its schema and its query config, as `validateAndTransformQuery` takes them. */
export type StoreRouteQuery = {
  schema: z.ZodType
  config: QueryConfig<BaseEntity>
}

/** The store routes' queries of a collection: its list and a single document. */
export type StoreQuery = {
  list: StoreRouteQuery
  retrieve: StoreRouteQuery
}

/** What `prepareStoreQuery` reads of a collection and the registry. */
export type StoreQueryInput = {
  /** The collection's fields, each with whether the store leaves it out. */
  fields: RegistryField[]
  /** The collection's columns the store answers, from `listStoreColumns`. */
  columns: string[]
  /** The collection's areas, with the block types each allows. */
  areas: RegistryArea[]
  /** The registry's block types, by slug, with their fields and areas. */
  blocks: Record<string, Pick<RegistryBlock, "slug" | "fields" | "areas">>
  /** How many levels of areas a document nests: its own areas are level 1. */
  maxDepth: number
}
