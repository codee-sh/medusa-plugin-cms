import type { ManagerFormFieldConfig } from "../types"

/** Items side by side in a form. */
export type LayoutRowConfig = {
  type: "row"
  /** The names of the items, in the order shown. */
  fields: string[]
}

/** Items under one label in a form. */
export type LayoutGroupConfig = {
  type: "group"
  label: string
  description?: string
  fields: (string | LayoutRowConfig | LayoutComponentConfig)[]
}

/** Items a component edits together, named by the form's caller; a header over it when it has a label. */
export type LayoutComponentConfig = {
  type: "component"
  /** The component's name, which the form's caller resolves. */
  component: string
  /** The items: a list of names, each handed under its name, or the component's keys mapped to names. */
  fields: string[] | Record<string, string>
  /** A header over a node of several items; a node of one item shows the item's own label. */
  label?: string
  description?: string
}

/** Items under a header the editor opens and closes in a form. */
export type LayoutCollapsibleConfig = {
  type: "collapsible"
  label: string
  description?: string
  /** Closed when the form opens; open when left out. */
  initCollapsed?: boolean
  fields: (
    string | LayoutGroupConfig | LayoutRowConfig | LayoutComponentConfig
  )[]
}

/** One tab of a section's tabs: the items shown while it is open. */
export type LayoutTabConfig = {
  label: string
  description?: string
  fields: (
    | string
    | LayoutGroupConfig
    | LayoutRowConfig
    | LayoutCollapsibleConfig
    | LayoutComponentConfig
  )[]
}

/** Tabs inside a form section, showing one tab's items at a time. */
export type LayoutTabsConfig = {
  type: "tabs"
  tabs: LayoutTabConfig[]
}

/** What a form section lays out: an item's name, or a node holding names. */
export type LayoutItemConfig =
  | string
  | LayoutGroupConfig
  | LayoutRowConfig
  | LayoutCollapsibleConfig
  | LayoutTabsConfig
  | LayoutComponentConfig

/** A section of a form: its label, when it has one, the layout of what it shows, and its column. */
export type LayoutSectionConfig = {
  label?: string
  description?: string
  /** The names of the items the section shows and the nodes that hold them, in the order shown. */
  fields: LayoutItemConfig[]
  /** The column the section sits in; `main` when left out. */
  position?: "main" | "side"
}

/** An item a component node edits, and the key its component reads it under. */
export type KeyedItem<TItem> = {
  key: string
  item: TItem
}

/** A field of a component node, described for the toolkit: the key its component reads it under, and its config. */
export type LayoutComponentEntry = {
  key: string
  config: ManagerFormFieldConfig
}
