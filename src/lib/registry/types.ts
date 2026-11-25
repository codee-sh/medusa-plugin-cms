import type { RegistryAreaModel } from "../area/types"
import type { RegistryBlock } from "../block/types"
import type { RegistryCollection } from "../collection/types"
import type { ClientText, CmsTableConfig } from "../config/types"
import type { RegistryMedia } from "../media/types"

/** A collection on a route's page, resolved. */
export type RegistryRouteEntry<TText = ClientText> = {
  collection: string
  /** The entry's name on the page: its table's key for a list. */
  key: string
  /** A list's column; none for a singleton, whose sections keep their own. */
  position?: "main" | "side"
  /** A list's table heading on the page; its collection's plural label when left out. */
  label?: TText
  description?: TText
  /** A list's table: its `admin.table`, the entry's settings in place; none for a singleton. */
  table?: CmsTableConfig<TText>
}

/** A page of the Admin, placed in the routes' tree. */
export type RegistryRoute<TText = ClientText> = {
  /** The page's address, `/cms/<slug>`. */
  slug: string
  /** The page's name: the route's `label`, or its one collection's page label. */
  label: TText
  description?: TText
  /** The collections the page shows, in order. */
  collections: RegistryRouteEntry<TText>[]
  /** The slug of the route whose page this one sits under; none at the top level. */
  parent?: string
  /** The slugs of the routes under this one, in order. */
  children: string[]
}

export type Registry = {
  /** The module whose service holds every registered model. */
  module: string
  /** The model that ties documents to their blocks; none for a config without areas or blocks. */
  area?: RegistryAreaModel
  collections: Record<string, RegistryCollection>
  /** The Admin's pages, in the tree's order: each route before its children. */
  routes: RegistryRoute[]
  blocks: Record<string, RegistryBlock>
  /** How many levels of areas a document can nest: its own areas are level 1. */
  maxDepth: number
  /** The media provider; none for a config without media fields. */
  media?: RegistryMedia
  /** The i18next namespace whose keys the config's Admin texts are; none when they are plain text. */
  translationNs?: string
}
