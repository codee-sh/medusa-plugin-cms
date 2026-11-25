import { Tabs } from "@medusajs/ui"
import { useMemo } from "react"
import type { FieldValues, UseFormReturn } from "react-hook-form"
import { useLayoutErrorCount } from "../hooks/use-layout-error-count"
import { LayoutErrorBadge } from "../layout-error-badge"
import type { LayoutTabConfig } from "../types"
import { collectLayoutNames } from "../utils/collect-layout-names"

type LayoutTabTriggerProps<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  /** The form path the tab's items sit under. */
  name: string
  /** The tab's value among its tabs. */
  value: string
  tab: LayoutTabConfig
}

/**
 * Shows a tab's label in its tabs' list, with how many errors its items hold.
 *
 * @param props - The form, the path the tab's items sit under, the tab's value and the tab.
 */
export const LayoutTabTrigger = <TValues extends FieldValues>({
  form,
  name,
  value,
  tab,
}: LayoutTabTriggerProps<TValues>) => {
  const names = useMemo(() => collectLayoutNames(tab.fields), [tab])
  const errorCount = useLayoutErrorCount(form, name, names)

  return (
    <Tabs.Trigger value={value}>
      <span className="flex items-center gap-x-2">
        {tab.label}
        <LayoutErrorBadge count={errorCount} />
      </span>
    </Tabs.Trigger>
  )
}
