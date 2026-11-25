import { RouteDrawer, useRouteModal } from "@medusajs/dashboard/components"
import type { ClientCollection } from "../../../lib/collection/types"
import type { AdminDocument } from "../../../workflows/cms/utils/build-admin-document"
import type { SectionCard } from "../page-sections/utils/list-section-cards"
import { DocumentDrawerForm } from "./document-drawer-form"

type DocumentDrawerRouteFormProps = {
  collection: ClientCollection
  /** The sections the drawer edits, in order: one card of a singleton, or every section of a row. */
  sections: SectionCard[]
  /** The document, `null` before a singleton's first save. */
  document: AdminDocument | null
  /** The page the drawer closes to after a save. */
  successPath: string
}

/**
 * The drawer form on a route of the plugin, inside a `RouteDrawer`: the route's form asks before unsaved
 * changes are dropped, and a save closes the drawer to the page the route names.
 *
 * @param props - The collection, the sections, the document, and the page closed to.
 */
export const DocumentDrawerRouteForm = ({
  collection,
  sections,
  document,
  successPath,
}: DocumentDrawerRouteFormProps) => {
  const { handleSuccess } = useRouteModal()

  return (
    <DocumentDrawerForm
      collection={collection}
      sections={sections}
      document={document}
      Frame={RouteDrawer.Form}
      onSaved={() => handleSuccess(successPath)}
    />
  )
}
