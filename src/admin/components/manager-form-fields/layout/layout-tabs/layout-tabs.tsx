import { clx, Tabs, Text } from "@medusajs/ui"
import { type ReactNode, useState } from "react"
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
 * open, so what the editor did in it is kept. The open tab is the component's state, so a closed tab
 * hides through `hidden`, a class the dashboard's own styles hold: the Admin's Tailwind never reads a
 * plugin's built bundle, and a class only the plugin uses, such as `data-[state=inactive]:hidden`, is
 * never generated.
 *
 * @param props - The form, the path the items sit under, the tabs and how the form renders one.
 */
export const LayoutTabs = <TValues extends FieldValues>({
  form,
  name,
  tabs,
  renderContent,
}: LayoutTabsProps<TValues>) => {
  const [open, setOpen] = useState("0")

  return (
    <Tabs value={open} onValueChange={setOpen}>
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
          className={clx(
            "flex flex-col gap-y-4 pt-4",
            open !== String(index) && "hidden"
          )}
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
}
