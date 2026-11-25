import { TriangleRightMini } from "@medusajs/icons"
import { Fragment } from "react"
import { Link, useMatches } from "react-router-dom"
import { useCmsCollections } from "../../hooks/use-cms-collections"
import { buildCmsPath } from "../common/utils/build-cms-path"
import { listRouteChain } from "../common/utils/list-route-chain"

type RouteBreadcrumbProps = {
  /** The route's slug, from the URL. */
  slug: string
  /** The path of the route the breadcrumb belongs to. */
  pathname: string
}

/**
 * A route's breadcrumb: its label after those of the routes it sits under, as `Pages`, then
 * `Page settings`, with the dashboard's separator between them. As the last breadcrumb each parent links
 * to its page; before it, the dashboard links the whole breadcrumb to the route's page, so the parents
 * are text. The slug shows while the routes load.
 *
 * @param props - The route's slug and the path of the route's match.
 */
export const RouteBreadcrumb = ({ slug, pathname }: RouteBreadcrumbProps) => {
  const { data } = useCmsCollections()
  const matches = useMatches()
  const chain = listRouteChain(data?.routes ?? [], slug)
  // The dashboard links every breadcrumb but the last; a link cannot hold another.
  const isLast =
    matches
      .filter((match) => (match.handle as { breadcrumb?: unknown })?.breadcrumb)
      .at(-1)?.pathname === pathname

  if (!chain.length) {
    return <>{slug}</>
  }

  return (
    <>
      {chain.map((route, index) =>
        index < chain.length - 1 ? (
          <Fragment key={route.slug}>
            {isLast ? (
              <Link
                to={buildCmsPath(route.slug)}
                className="transition-fg hover:text-ui-fg-subtle"
              >
                {route.label}
              </Link>
            ) : (
              route.label
            )}
            {/* The dashboard's own separator between breadcrumbs. */}
            <span className="mx-2 inline-flex">
              <TriangleRightMini className="rtl:rotate-180" />
            </span>
          </Fragment>
        ) : (
          <Fragment key={route.slug}>{route.label}</Fragment>
        )
      )}
    </>
  )
}
