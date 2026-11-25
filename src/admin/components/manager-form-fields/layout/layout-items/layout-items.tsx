import type { ReactNode } from "react"

type LayoutItemsProps = {
  /** The items, rendered by the form. */
  children: ReactNode
}

/**
 * Stacks the items of a group, a collapsible or a tab, as far apart as the fields of any form section.
 *
 * @param props - The items.
 */
export const LayoutItems = ({ children }: LayoutItemsProps) => (
  <div className="flex flex-col gap-y-4">{children}</div>
)
