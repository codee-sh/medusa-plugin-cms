import type { ReactNode } from "react"

/**
 * What a CMS page draws in each column of the CMS's layout, before the column's widgets. The blocks are
 * no entries of `LayoutComposer`, so no editor moves or hides them in Customize Layout.
 */
export type PageBlocks = {
  main?: ReactNode
  /**
   * The side column's blocks. Left out, the page has no side column of its own: the layout draws one
   * only for a widget placed there, or while Customize Layout is open.
   */
  side?: ReactNode
}
