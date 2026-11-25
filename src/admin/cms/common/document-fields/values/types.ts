import type { Field } from "../../../../../lib/field/types"

/** What the read-only view of one kind of field gets. */
export type DocumentValueProps = {
  field: Field
  /** The value as the document's read holds it: a media field's records in place of their values. */
  value: unknown
  /**
   * The values the same field holds on the page the view stands on, a table's column: a view that reads
   * labels asks with all of them, so the page's cells send one request; its own value alone when left
   * out.
   */
  pageValues?: string[]
}
