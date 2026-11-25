import type { ReactNode } from "react"

/** A type the items of a `BlocksField` may have. */
export type BlocksFieldType = {
  /** The value an item of this type holds under `block_type`. */
  slug: string
  label: string
  /** The name of the item's field whose text value names it in its card's header. */
  summaryField?: string
}

/** What draws an open card's content: the item's fields, under the item's form path. */
export type BlocksFieldRenderBlock = (props: {
  /** The item's form path, as `document.sections.2`. */
  path: string
  type: BlocksFieldType
  index: number
}) => ReactNode

/** An item of a `BlocksField`: its id once saved, its type, and its own values. */
export type BlocksFieldItem = {
  id?: string
  block_type: string
  [key: string]: unknown
}

/** The form seen from a `BlocksField`: a list of items at any path. */
export type BlocksFormValues = Record<string, BlocksFieldItem[]>
