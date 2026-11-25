import type { LayoutItemConfig } from "../types"
import { listComponentItems } from "./list-component-items"

/**
 * Lists the item names a layout holds, through its nodes and their tabs, a component node's whether listed
 * or mapped to keys.
 *
 * @param items - The layout.
 * @returns The names, in the order shown.
 */
export const collectLayoutNames = (items: LayoutItemConfig[]): string[] =>
  items.flatMap((item) => {
    if (typeof item === "string") {
      return [item]
    }

    if (item.type === "component") {
      return listComponentItems(item).map(({ name }) => name)
    }

    return item.type === "tabs"
      ? item.tabs.flatMap((tab) => collectLayoutNames(tab.fields))
      : collectLayoutNames(item.fields)
  })
