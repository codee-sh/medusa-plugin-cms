import type { LayoutItemConfig, LayoutTabConfig } from "../types"
import { listComponentItems } from "./list-component-items"

/**
 * Keeps the parts of a layout a form shows: the names it shows, and the nodes and tabs still holding one.
 * Tabs left with one tab stay tabs. A component node stays whole while it shows any of its items.
 *
 * @param items - The layout.
 * @param isShown - Whether the form shows the item of a name.
 * @returns The layout without the names the form does not show and the nodes and tabs left empty.
 */
export const pruneLayoutToShown = (
  items: LayoutItemConfig[],
  isShown: (name: string) => boolean
): LayoutItemConfig[] =>
  items.flatMap((item): LayoutItemConfig[] => {
    if (typeof item === "string") {
      return isShown(item) ? [item] : []
    }

    // A component edits all its items together, so it stays whole while it shows any of them.
    if (item.type === "component") {
      return listComponentItems(item).some(({ name }) => isShown(name))
        ? [item]
        : []
    }

    // Pruning only removes items, so a node or a tab keeps no item its type does not take.
    if (item.type === "tabs") {
      const tabs = item.tabs.flatMap((tab) => {
        const fields = pruneLayoutToShown(tab.fields, isShown)

        return fields.length ? [{ ...tab, fields } as LayoutTabConfig] : []
      })

      return tabs.length ? [{ ...item, tabs }] : []
    }

    const fields = pruneLayoutToShown(item.fields, isShown)

    return fields.length ? [{ ...item, fields } as LayoutItemConfig] : []
  })
