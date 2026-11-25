import { Spinner } from "@medusajs/icons"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { useMemo } from "react"
import type { CmsRouteWidgetData } from "../../../admin-extensions/types"
import type { ClientCollection } from "../../../lib/collection/types"
import type { RegistryRoute } from "../../../lib/registry/types"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import { buildFieldDefaults } from "../common/utils/build-field-defaults"
import { PageBlocksContext } from "../page-layout/page-blocks-context"
import { listSectionCards } from "../page-sections/utils/list-section-cards"
import { RouteListTable } from "../route-list-table"
import { useSingletonDocuments } from "../singleton-page"
import { SingletonSectionCard } from "../singleton-page/singleton-section-card"
import { ListEntry } from "./list-entry"

type RoutePageProps = {
  route: RegistryRoute<string>
  /** The collections the route shows, in its order. */
  collections: ClientCollection[]
}

/**
 * A route's page in the CMS's two columns: its collections in order, a list as its table in its entry's
 * column and a singleton as its sections in their own columns, its cards showing its document or each
 * field's empty value before the first save; on a route that is not one list alone, the routes under it
 * after them; and a host's widgets in `cms.route.details` and `.side`, which Customize Layout arranges
 * alone. A route of one list keeps the routes under it as its table's buttons.
 *
 * @param props - The route and its collections.
 * @throws The singletons' requests' error, for the dashboard's error boundary.
 */
export const RoutePage = ({ route, collections }: RoutePageProps) => {
  const { t } = useCmsTranslation()
  const singletons = useMemo(
    () => collections.filter(({ singleton }) => singleton),
    [collections]
  )
  const { documents, isError, error } = useSingletonDocuments(
    singletons.map(({ slug }) => slug)
  )
  const cards = useMemo(
    () =>
      Object.fromEntries(
        singletons.map((singleton) => [
          singleton.slug,
          listSectionCards(singleton),
        ])
      ),
    [singletons]
  )
  const alone = collections.length === 1 && !collections[0].singleton

  if (isError) {
    throw error
  }

  if (!documents) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="text-ui-fg-interactive animate-spin" />
      </div>
    )
  }

  /**
   * Renders the blocks of one column: each list placed there, and each singleton's sections placed
   * there, in the route's order.
   *
   * @param position - The column.
   * @returns The blocks.
   */
  const renderColumn = (position: "main" | "side") =>
    route.collections.flatMap((entry) => {
      const collection = collections.find(
        ({ slug }) => slug === entry.collection
      )

      if (!collection) {
        return []
      }

      if (!collection.singleton) {
        return entry.position === position
          ? [
              <ListEntry
                key={entry.key}
                route={route}
                entry={entry}
                collection={collection}
                alone={alone}
              />,
            ]
          : []
      }

      const values =
        documents[collection.slug] ?? buildFieldDefaults(collection.fields)

      return cards[collection.slug][position].map((card) => (
        <SingletonSectionCard
          key={`${entry.key}:${card.key}`}
          singleton={collection.slug}
          card={card}
          values={values}
        />
      ))
    })

  const side = renderColumn("side")

  return (
    <PageBlocksContext.Provider
      value={{
        main: [
          ...renderColumn("main"),
          ...(!alone && route.children.length
            ? [
                <RouteListTable
                  key="children"
                  parent={route.slug}
                  heading={t("routes.children")}
                  headingLevel="h2"
                />,
              ]
            : []),
        ],
        // Without blocks of its own the page has no side column, so its tables take the full width.
        ...(side.length > 0 && { side }),
      }}
    >
      <LayoutComposer
        widgetsZonePrefix="cms.route.details"
        preferredLayoutId="cms:two-column"
        hasOutlet={false}
        data={
          {
            route: { slug: route.slug, label: route.label },
            collections: collections.map(({ slug, labels, singleton }) => ({
              slug,
              labels,
              singleton,
              ...(singleton && { document: documents[slug] }),
            })),
          } satisfies CmsRouteWidgetData
        }
        sections={{ main: null, side: null }}
      />
    </PageBlocksContext.Provider>
  )
}
