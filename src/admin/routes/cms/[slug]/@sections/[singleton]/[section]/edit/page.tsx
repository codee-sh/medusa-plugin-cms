import { RouteDrawer } from "@medusajs/dashboard/components"
import { Heading } from "@medusajs/ui"
import { useParams } from "react-router-dom"
import { listSectionCards } from "../../../../../../../cms/page-sections/utils/list-section-cards"
import { useSingletonDocuments } from "../../../../../../../cms/singleton-page"
import { DocumentDrawerRouteForm } from "../../../../../../../cms/document-drawer-form"
import { buildCmsPath } from "../../../../../../../cms/common/utils/build-cms-path"
import { useCmsRoute } from "../../../../../../../hooks/use-cms-route"

/**
 * The drawer over a route's page that edits one section of a singleton the route shows, the singleton
 * and the section named in its address. The page under it draws once its route is known, so the
 * singleton is known when the drawer opens.
 *
 * @throws The request's error, and an error for a singleton the route does not show or a section it does
 * not have, for the dashboard's error boundary.
 */
const SingletonSectionEditPage = () => {
  const { slug, singleton, section } = useParams()
  const route = useCmsRoute(slug!)
  const collection = route.data?.collections.find(
    (candidate) => candidate.slug === singleton && candidate.singleton
  )
  const { documents, isError, error } = useSingletonDocuments(
    collection ? [collection.slug] : []
  )
  const document = collection && documents?.[collection.slug]
  const cards = collection && listSectionCards(collection)
  const card =
    cards && [...cards.main, ...cards.side].find(({ key }) => key === section)

  if (route.isError) {
    throw route.error
  }

  if (isError) {
    throw error
  }

  if (route.isSuccess && (!collection || !card)) {
    throw new Error(`No section "${section}" of "${singleton}" in "${slug}"`)
  }

  return (
    <RouteDrawer prev={buildCmsPath(slug)}>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{card?.label}</Heading>
        </RouteDrawer.Title>
        {card?.description && (
          <RouteDrawer.Description>{card.description}</RouteDrawer.Description>
        )}
      </RouteDrawer.Header>
      {collection && card && document !== undefined && (
        <DocumentDrawerRouteForm
          collection={collection}
          sections={[card]}
          document={document}
          successPath={buildCmsPath(slug)}
        />
      )}
    </RouteDrawer>
  )
}

export default SingletonSectionEditPage
