import { collectLayoutNames } from "./collect-layout-names"
import { pruneLayoutToShown } from "./prune-layout-to-shown"
import type { LayoutItemConfig, LayoutSectionConfig } from "../types"

/** A section with what the form shows in it. */
export type FormFieldSection<
  TSection extends LayoutSectionConfig = LayoutSectionConfig,
> = Omit<TSection, "fields"> & {
  /** The section's layout, pruned to the items the form shows. */
  layout: LayoutItemConfig[]
}

/**
 * Lays a form's items out in its sections: the items in no section, then each section with an item the
 * form shows, apart by column. It renders nothing: the form puts the sections where it wants them, the
 * two columns of a page through the dashboard's `LayoutComposer`, and a section's layout through
 * `FormLayout`.
 *
 * @param items - What the form shows, each with a `name`, such as its fields.
 * @param sections - The sections, each laying out its items.
 * @returns The items in no section, in the items' order, and the sections of the `main` and the `side`
 * column, each in the sections' order without the sections that show nothing.
 */
export const sectionFormFields = <
  TItem extends { name: string },
  TSection extends LayoutSectionConfig,
>(
  items: TItem[],
  sections: TSection[]
): {
  unsectioned: TItem[]
  main: FormFieldSection<TSection>[]
  side: FormFieldSection<TSection>[]
} => {
  const sectioned = sections.flatMap((section) =>
    collectLayoutNames(section.fields)
  )
  const shown = sections.flatMap(({ fields, ...section }) => {
    const layout = pruneLayoutToShown(fields, (name) =>
      items.some((item) => item.name === name)
    )

    return layout.length ? [{ ...section, layout }] : []
  })

  return {
    unsectioned: items.filter(({ name }) => !sectioned.includes(name)),
    main: shown.filter(({ position }) => position !== "side"),
    side: shown.filter(({ position }) => position === "side"),
  }
}
