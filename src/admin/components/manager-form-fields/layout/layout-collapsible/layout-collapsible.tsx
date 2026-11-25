import { TriangleDownMini, TriangleRightMini } from "@medusajs/icons"
import { type ReactNode, useId, useMemo, useState } from "react"
import type { FieldValues, UseFormReturn } from "react-hook-form"
import { useLayoutErrorCount } from "../hooks/use-layout-error-count"
import { LayoutErrorBadge } from "../layout-error-badge"
import { LayoutHeading } from "../layout-heading"
import { LayoutItems } from "../layout-items"
import type { LayoutCollapsibleConfig } from "../types"
import { collectLayoutNames } from "../utils/collect-layout-names"

type LayoutCollapsibleProps<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  /** The form path the collapsible's items sit under. */
  name: string
  collapsible: LayoutCollapsibleConfig
  /** The collapsible's items, rendered by the form. */
  children: ReactNode
}

/**
 * Shows a form's items in a bordered box under a header the editor opens and closes, open unless the
 * config starts it closed. While closed it shows how many errors its items hold. Its items stay
 * mounted while it is closed, so what the editor did in them is kept.
 *
 * @param props - The form, the path its items sit under, the collapsible and its items.
 */
export const LayoutCollapsible = <TValues extends FieldValues>({
  form,
  name,
  collapsible,
  children,
}: LayoutCollapsibleProps<TValues>) => {
  const [open, setOpen] = useState(!collapsible.initCollapsed)
  const contentId = useId()
  const names = useMemo(
    () => collectLayoutNames(collapsible.fields),
    [collapsible]
  )
  const errorCount = useLayoutErrorCount(form, name, names)

  return (
    <div className="border-ui-border-base rounded-md border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen(!open)}
        className="focus-visible:shadow-borders-focus flex w-full items-start gap-x-2 rounded-md px-3 py-2 text-left outline-none"
      >
        <span className="text-ui-fg-muted pt-0.5">
          {open ? <TriangleDownMini /> : <TriangleRightMini />}
        </span>
        <span className="flex min-w-0 flex-1">
          <LayoutHeading
            label={collapsible.label}
            description={collapsible.description}
          />
        </span>
        {!open && <LayoutErrorBadge count={errorCount} />}
      </button>
      <div id={contentId} hidden={!open} className="border-t px-3 py-4">
        <LayoutItems>{children}</LayoutItems>
      </div>
    </div>
  )
}
