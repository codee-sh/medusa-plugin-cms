import type { ReactNode } from "react"
import { LayoutHeading } from "../layout-heading"
import { LayoutItems } from "../layout-items"

type LayoutGroupProps = {
  label: string
  description?: string
  /** The group's items, rendered by the form. */
  children: ReactNode
}

/**
 * Shows a form's items in a bordered box under their label, the same box as a collapsible's but with a
 * header that does not close.
 *
 * @param props - The group's label, description and items.
 */
export const LayoutGroup = ({
  label,
  description,
  children,
}: LayoutGroupProps) => (
  <div className="border-ui-border-base rounded-md border">
    <div className="px-3 py-2">
      <LayoutHeading label={label} description={description} />
    </div>
    <div className="border-t px-3 py-4">
      <LayoutItems>{children}</LayoutItems>
    </div>
  </div>
)
