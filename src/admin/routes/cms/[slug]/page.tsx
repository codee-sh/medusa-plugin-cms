import { Spinner } from "@medusajs/icons"
import { Outlet, type UIMatch, useParams } from "react-router-dom"
import { RouteBreadcrumb } from "../../../cms/route-breadcrumb"
import { RoutePage as RouteContent } from "../../../cms/route-page"
import { useCmsRoute } from "../../../hooks/use-cms-route"

/**
 * A route's page, at `/cms/<slug>`: the collections it shows, each as its kind draws, and the modal or
 * drawer open over it.
 *
 * @throws The collection list's error, and an error for a slug no route has, for the dashboard's error
 * boundary.
 */
const RoutePage = () => {
  const { slug } = useParams()
  const { data, isPending, isError, error } = useCmsRoute(slug!)

  if (isError) {
    throw error
  }

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="text-ui-fg-interactive animate-spin" />
      </div>
    )
  }

  if (!data) {
    throw new Error(`Page "${slug}" was not found`)
  }

  return (
    <>
      <RouteContent route={data.route} collections={data.collections} />
      <Outlet />
    </>
  )
}

export const handle = {
  /**
   * Names the route's page in the breadcrumbs, after the pages it sits under.
   *
   * @param match - The route's match.
   * @returns The breadcrumb.
   */
  breadcrumb: (match: UIMatch) => (
    <RouteBreadcrumb slug={match.params.slug!} pathname={match.pathname} />
  ),
}

export default RoutePage
