import { RouteFocusModal, useRouteModal } from "@medusajs/dashboard/components"
import type { ClientCollection } from "../../../lib/collection/types"
import { buildCmsPath } from "../common/utils/build-cms-path"
import { DocumentCreateForm } from "./document-create-form"

type DocumentCreateRouteFormProps = {
  collection: ClientCollection
  /** The page opened after a create; the new document's page when left out. */
  successPath?: string
}

/**
 * The create form on a route of the plugin, inside a `RouteFocusModal`: the route's form asks before
 * unsaved changes are dropped, and a save closes the modal to the new document's page, or the page the
 * route names.
 *
 * @param props - The collection the document belongs to, and the page opened after a create.
 */
export const DocumentCreateRouteForm = ({
  collection,
  successPath,
}: DocumentCreateRouteFormProps) => {
  const { handleSuccess } = useRouteModal()

  return (
    <DocumentCreateForm
      collection={collection}
      Frame={RouteFocusModal.Form}
      onSaved={(created) =>
        handleSuccess(
          successPath ??
            buildCmsPath(collection.admin.route, collection.slug, created.id)
        )
      }
    />
  )
}
