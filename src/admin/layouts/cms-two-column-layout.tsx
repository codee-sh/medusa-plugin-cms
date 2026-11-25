import { defineLayoutConfig } from "@medusajs/admin-sdk"
import type { LayoutComponentProps } from "@medusajs/dashboard/components"
import { clx } from "@medusajs/ui"
import { usePageBlocks } from "../cms/page-layout/use-page-blocks"

/**
 * Lays a CMS page out in two columns, as the dashboard's `core:two-column` does. Each column draws the
 * page's blocks first, where the config places them, then the column's widgets, which the dashboard
 * hands over as `sections`: plain in view mode, as drop zones in Customize Layout. So an editor moves
 * and hides widgets alone. A page with no side column of its own, a list's, takes the full width until
 * a widget stands on the side or Customize Layout opens its drop zone.
 *
 * @param props - The column's widgets, and a class for the layout's root.
 */
const CmsTwoColumnLayout = ({ sections, className }: LayoutComponentProps) => {
  const blocks = usePageBlocks()
  // In view mode a column's widgets are a list, empty without any; in edit mode its drop zone.
  const hasSideWidgets = Array.isArray(sections.side)
    ? sections.side.length > 0
    : Boolean(sections.side)

  if (blocks.side === undefined && !hasSideWidgets) {
    return (
      <div className={clx("flex w-full flex-col gap-y-3", className)}>
        {blocks.main}
        {sections.main}
      </div>
    )
  }

  return (
    <div
      className={clx(
        "flex w-full flex-col items-start gap-x-4 gap-y-3 xl:grid xl:grid-cols-[minmax(0,_1fr)_440px]",
        className
      )}
    >
      <div className="flex w-full min-w-0 flex-col gap-y-3">
        {blocks.main}
        {sections.main}
      </div>
      <div className="flex w-full flex-col gap-y-3 xl:mt-0">
        {blocks.side}
        {sections.side}
      </div>
    </div>
  )
}

export const config = defineLayoutConfig({
  id: "cms:two-column",
  sections: [
    { id: "main", ordering: "list" },
    { id: "side", ordering: "list" },
  ],
})

export default CmsTwoColumnLayout
