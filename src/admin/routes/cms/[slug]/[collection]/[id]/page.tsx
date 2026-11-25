import { Spinner } from "@medusajs/icons"
import { useParams } from "react-router-dom"
import { DocumentDetailsSection } from "../../../../../cms/document-details-section"
import { DocumentEditForm } from "../../../../../cms/document-edit-form"
import { useCmsRoute } from "../../../../../hooks/use-cms-route"
import { useDocument } from "../../../../../hooks/api/documents/documents"

/**
 * A document's page, at `/cms/<route>/<collection>/<id>`: its fields in sections with **Save**, the
 * collection's sections in either column, and when and by whom it was created and changed on the side.
 *
 * An unknown document fails its request with a 404, which reaches the dashboard's error boundary.
 *
 * @throws The requests' errors, and an error for a collection that is no list of the route, for the
 * dashboard's error boundary.
 */
const DocumentPage = () => {
  const { slug, collection: name, id } = useParams()
  const route = useCmsRoute(slug!)
  const collection = route.data?.collections.find(
    (candidate) => candidate.slug === name && !candidate.singleton
  )
  const { data, isError, error } = useDocument(name!, id!, {
    enabled: Boolean(collection),
  })

  if (route.isError) {
    throw route.error
  }

  if (route.isSuccess && !collection) {
    throw new Error(`Page "${slug}" holds no list "${name}"`)
  }

  if (isError) {
    throw error
  }

  if (!collection || !data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="text-ui-fg-interactive animate-spin" />
      </div>
    )
  }

  return (
    <DocumentEditForm
      // A new latest version opens the form anew: after a save, a publish, or a reload.
      key={`${data.document.id}-${data.latest_version?.version ?? "row"}`}
      collection={collection}
      document={data.document}
      latestVersion={data.latest_version}
      aside={
        <DocumentDetailsSection
          document={data.document}
          latestVersion={data.latest_version}
        />
      }
    />
  )
}

export default DocumentPage
