import { Fragment, type ReactNode } from "react"
import type { FieldValues, UseFormReturn } from "react-hook-form"
import { LayoutCollapsible } from "../layout-collapsible"
import { LayoutGroup } from "../layout-group"
import { LayoutRow } from "../layout-row"
import { LayoutTabs } from "../layout-tabs"
import { listComponentItems } from "../utils/list-component-items"
import type {
  KeyedItem,
  LayoutComponentConfig,
  LayoutItemConfig,
} from "../types"

type FormLayoutProps<
  TItem extends { name: string },
  TValues extends FieldValues,
> = {
  form: UseFormReturn<TValues>
  /** The form path the items sit under, where tabs and collapsibles count their errors. */
  name: string
  /** The layout, pruned to what the form shows. */
  layout: LayoutItemConfig[]
  /** What the form shows, each found in the layout by its `name`. */
  items: TItem[]
  /** Renders an item; the form keeps what belongs to its items. */
  renderItem: (item: TItem) => ReactNode
  /** Renders a component node with the items it edits, in its order, as the form resolves its component. */
  renderComponent: (
    node: LayoutComponentConfig,
    items: KeyedItem<TItem>[]
  ) => ReactNode
}

/**
 * Renders a form section's layout: each item through the form's `renderItem`, a group under its label, a
 * row side by side, a collapsible under a header that opens and closes it, tabs one at a time, and a
 * component node through the form's `renderComponent`. It adds no wrapper, so the section sets the
 * spacing between its items.
 *
 * @param props - The form, the path its items sit under, the layout, the form's items and how the form
 * renders one and a component node.
 */
export const FormLayout = <
  TItem extends { name: string },
  TValues extends FieldValues,
>({
  form,
  name,
  layout,
  items,
  renderItem,
  renderComponent,
}: FormLayoutProps<TItem, TValues>) => {
  /**
   * Renders the item of a name, or nothing when the form holds no item of it.
   *
   * @param itemName - The item's name in the layout.
   */
  const renderName = (itemName: string) => {
    const item = items.find((candidate) => candidate.name === itemName)

    return item ? <Fragment key={itemName}>{renderItem(item)}</Fragment> : null
  }

  /**
   * Renders the layout a node holds, with the same form, items and renderer.
   *
   * @param nested - The node's layout.
   */
  const renderLayout = (nested: LayoutItemConfig[]) => (
    <FormLayout
      form={form}
      name={name}
      layout={nested}
      items={items}
      renderItem={renderItem}
      renderComponent={renderComponent}
    />
  )

  /**
   * Renders a component node through the form's renderer, with the items it edits under their keys.
   *
   * @param node - The node.
   * @param index - Its place in the layout, for its key.
   */
  const renderNode = (node: LayoutComponentConfig, index: number) => {
    const nodeItems = listComponentItems(node).flatMap(
      ({ key, name: itemName }) =>
        items
          .filter((candidate) => candidate.name === itemName)
          .map((item) => ({ key, item }))
    )

    return (
      <Fragment key={`component-${index}`}>
        {renderComponent(node, nodeItems)}
      </Fragment>
    )
  }

  return (
    <>
      {layout.map((item, index) => {
        if (typeof item === "string") {
          return renderName(item)
        }

        switch (item.type) {
          case "row":
            return (
              <LayoutRow key={`row-${index}`}>
                {item.fields.map(renderName)}
              </LayoutRow>
            )
          case "group":
            return (
              <LayoutGroup
                key={`group-${index}`}
                label={item.label}
                description={item.description}
              >
                {renderLayout(item.fields)}
              </LayoutGroup>
            )
          case "collapsible":
            return (
              <LayoutCollapsible
                key={`collapsible-${index}`}
                form={form}
                name={name}
                collapsible={item}
              >
                {renderLayout(item.fields)}
              </LayoutCollapsible>
            )
          case "component":
            return renderNode(item, index)
          case "tabs":
            return (
              <LayoutTabs
                key={`tabs-${index}`}
                form={form}
                name={name}
                tabs={item.tabs}
                renderContent={(tab) => renderLayout(tab.fields)}
              />
            )
        }
      })}
    </>
  )
}
