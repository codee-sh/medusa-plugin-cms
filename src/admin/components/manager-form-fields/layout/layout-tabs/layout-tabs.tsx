import { Tabs, Text } from "@medusajs/ui"
import type { ReactNode } from "react"
import type { FieldValues, UseFormReturn } from "react-hook-form"
import { LayoutItems } from "../layout-items"
import { LayoutTabTrigger } from "./layout-tab-trigger"
import type { LayoutTabConfig } from "../types"

type LayoutTabsProps<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  /** The form path the tabs' items sit under. */
  name: string
  tabs: LayoutTabConfig[]
  /** Renders a tab's items; the form keeps what belongs to them. */
  renderContent: (tab: LayoutTabConfig) => ReactNode
}

/**
 * Shows a form's items in tabs, one tab at a time, the first one open, each tab's label with how many
 * errors its items hold and its description above them. Every tab stays mounted, hidden while another is
 * open, so what the editor did in it is kept.
 *
 * @param props - The form, the path the items sit under, the tabs and how the form renders one.
 */
export const LayoutTabs = <TValues extends FieldValues>({
  form,
  name,
  tabs,
  renderContent,
}: LayoutTabsProps<TValues>) => (
  <Tabs defaultValue="0">
    <Tabs.List>
      {tabs.map((tab, index) => (
        <LayoutTabTrigger
          key={index}
          form={form}
          name={name}
          value={String(index)}
          tab={tab}
        />
      ))}
    </Tabs.List>
    {tabs.map((tab, index) => (
      <Tabs.Content
        key={index}
        value={String(index)}
        forceMount
        className="flex flex-col gap-y-4 pt-4 data-[state=inactive]:hidden"
      >
        {tab.description && (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {tab.description}
          </Text>
        )}
        <LayoutItems>{renderContent(tab)}</LayoutItems>
      </Tabs.Content>
    ))}
  </Tabs>
)
