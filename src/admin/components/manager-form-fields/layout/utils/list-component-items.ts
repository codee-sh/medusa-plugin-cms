import type { LayoutComponentConfig } from "../types"

/** An item a component node hands its component, and the key the component reads it under. */
export type ComponentItem = {
  key: string
  name: string
}

/**
 * Lists a component node's items with their keys: each item under its own name for a list, under the
 * component's key for a mapping.
 *
 * @param node - The node.
 * @returns The items, in the layout's order.
 */
export const listComponentItems = (
  node: Pick<LayoutComponentConfig, "fields">
): ComponentItem[] =>
  Array.isArray(node.fields)
    ? node.fields.map((name) => ({ key: name, name }))
    : Object.entries(node.fields).map(([key, name]) => ({ key, name }))
