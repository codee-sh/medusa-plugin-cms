import { prepareCollectionActions } from "../collection/prepare-collection-actions"
import type {
  PreparedCollection,
  RegistryCollection,
} from "../collection/types"
import { buildConfigError } from "../config/build-config-error"
import { prepareCmsText } from "../config/prepare-cms-text"
import { prepareConfigValue } from "../config/prepare-config-value"
import type { ClientText, CmsRoute, Config } from "../config/types"
import type { EntryTableContext } from "./prepare-entry-table"
import { prepareRouteEntries } from "./prepare-route-entries"
import type { RegistryRoute } from "./types"
import { type PlacedRoute, validateRouteNodes } from "./validate-route-nodes"
import { validateRouteReach } from "./validate-route-reach"

/**
 * Names a route's page: its `label`, or its one collection's page label, a singleton's singular and a
 * list's plural; a route of several collections needs a label.
 *
 * @param placed - The route, with its entries.
 * @param collections - Every collection, by slug.
 * @param translationNs - The config's `admin.translationNs`, which a label's `t` takes.
 * @returns The label.
 * @throws When a route of several collections gives none.
 */
const prepareRouteLabel = (
  { route, entries }: PlacedRoute,
  collections: Record<string, PreparedCollection>,
  translationNs: string | undefined
): ClientText => {
  const where = `admin "routes" route "${route.slug}"`

  if (route.label !== undefined) {
    return prepareCmsText(route.label, translationNs, `${where} label`)
  }

  if (entries.length > 1) {
    throw buildConfigError(
      `${where} needs a "label", as it shows several collections`
    )
  }

  const { singleton, labels } = collections[entries[0].collection]

  return singleton ? labels.singular : labels.plural
}

/**
 * Lists the routes of the tree, each with its label, its collections resolved, its parent's slug and
 * its children's slugs.
 *
 * @param placed - The routes, in the tree's order.
 * @param context - The collections, their configs and the namespace.
 * @returns The routes, in the same order.
 * @throws At the first route whose label or entries do not fit.
 */
const listRegistryRoutes = (
  placed: PlacedRoute[],
  context: EntryTableContext
): RegistryRoute[] =>
  placed.map((entry) => ({
    slug: entry.route.slug,
    label: prepareRouteLabel(entry, context.collections, context.translationNs),
    ...(entry.route.description !== undefined && {
      description: prepareCmsText(
        entry.route.description,
        context.translationNs,
        `admin "routes" route "${entry.route.slug}" description`
      ),
    }),
    collections: prepareRouteEntries(entry, context),
    parent: entry.parent,
    children: placed
      .filter((child) => child.parent === entry.route.slug)
      .map((child) => child.route.slug),
  }))

/**
 * Places every collection in the Admin's routes: the config's `admin.routes`, or a function of the
 * default run once, or the default - every collection a top-level route of its own slug, in config
 * order. Each route gets its label and its collections resolved, a list's table among them; each
 * collection, which stands on exactly one route, that route's slug; and the header buttons of a list a
 * route shows alone follow the route's children.
 *
 * @param config - The project's config, with its routes and its collections' configs.
 * @param collections - Every collection, by slug in the config's order.
 * @param translationNs - The config's `admin.translationNs`, which the tables' texts' `t` takes.
 * @returns The collections, each with its route and its header's actions, and the routes
 * in the tree's order.
 * @throws At the first route or collection the routes do not fit.
 */
export const prepareRoutes = (
  config: Config,
  collections: Record<string, PreparedCollection>,
  translationNs: string | undefined
): {
  collections: Record<string, RegistryCollection>
  routes: RegistryRoute[]
} => {
  const ordered = Object.values(collections)
  const defaults: CmsRoute[] = ordered.map(({ slug }) => ({
    slug,
    collections: [slug],
  }))
  // The function gets a copy, so it cannot change the defaults; its result is checked below.
  const placed = validateRouteNodes(
    prepareConfigValue(
      config.admin?.routes ?? defaults,
      {
        defaultRoutes: defaults.map((route) => ({
          ...route,
          collections: [...route.collections],
        })),
      },
      'admin: the "routes" function'
    ),
    collections
  )
  const context = { collections, configs: config.collections, translationNs }

  validateRouteReach(collections, placed)

  const routes = listRegistryRoutes(placed, context)
  const targets = {
    collections: routes.flatMap((route) =>
      route.collections.map(({ collection }) => collection)
    ),
    routes: routes.map(({ slug }) => slug),
  }

  return {
    routes,
    collections: Object.fromEntries(
      ordered.map((collection) => {
        // validateRouteReach has put every collection on a route.
        const route = routes.find((candidate) =>
          candidate.collections.some(
            (entry) => entry.collection === collection.slug
          )
        )!
        // A route's children are its table's buttons when the route shows that list alone.
        const children = route.collections.length === 1 ? route.children : []

        return [
          collection.slug,
          {
            ...collection,
            admin: {
              ...collection.admin,
              route: route.slug,
              actions: prepareCollectionActions(
                config.collections.find(
                  ({ slug }) => slug === collection.slug
                )!,
                children,
                targets,
                translationNs,
                `collection "${collection.slug}"`
              ),
            },
          },
        ]
      })
    ),
  }
}
