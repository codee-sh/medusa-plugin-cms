import { buildConfigError } from "../config/build-config-error"
import type { CmsRoute, CmsRouteEntryConfig } from "../config/types"
import type { PreparedCollection } from "../collection/types"
import { validateContentTypeSlug } from "./validate-content-type-slug"

/** A route of the tree, with the slug of the route whose page its own sits under. */
export type PlacedRoute = {
  route: CmsRoute
  parent?: string
  /** The collections the route's page shows, each as an object, in order. */
  entries: CmsRouteEntryConfig[]
}

/** What walking the tree reads and adds to. */
type RouteWalk = {
  /** Every collection, by slug. */
  collections: Record<string, PreparedCollection>
  /** The routes placed so far, in the tree's order. */
  placed: PlacedRoute[]
  /** The routes placed so far, by slug, which a slug once in the tree is checked against. */
  bySlug: Record<string, PlacedRoute>
}

/**
 * Lists the collections a route's page shows, each entry as an object.
 *
 * @param route - The route, as the config gave it.
 * @param where - The route's place, for error messages.
 * @returns The entries, in order.
 * @throws When the route gives no list, or an empty one.
 */
const listRouteEntries = (
  route: CmsRoute,
  where: string
): CmsRouteEntryConfig[] => {
  const { collections } = route as { collections?: unknown }

  // A JS config can give anything here, which the types do not allow.
  if (!Array.isArray(collections) || !collections.length) {
    throw buildConfigError(
      `${where} "collections" must be a list of one collection at least`
    )
  }

  return collections.map((entry: unknown) =>
    typeof entry === "string"
      ? { collection: entry }
      : ((entry ?? {}) as CmsRouteEntryConfig)
  )
}

/**
 * Checks one route: a snake_case slug no other route has, and collections that are registered and on
 * no other route, as a collection's documents have one address.
 *
 * @param route - The route, as the config gave it.
 * @param where - The route's level, for error messages.
 * @param walk - The collections and the routes placed so far.
 * @returns The route's entries.
 * @throws At the first part of the route that does not fit.
 */
const validateRoute = (
  route: CmsRoute,
  where: string,
  { collections, placed, bySlug }: RouteWalk
): CmsRouteEntryConfig[] => {
  const slug = (route as Partial<CmsRoute> | null)?.slug

  // A JS config can give anything here, which the types do not allow.
  if (typeof slug !== "string") {
    throw buildConfigError(`${where}: a route needs a "slug" of text`)
  }

  validateContentTypeSlug(slug, bySlug, `${where}: route "${slug}"`)

  const entries = listRouteEntries(route, `${where}: route "${slug}"`)
  const taken = placed.flatMap((entry) =>
    entry.entries.map(({ collection }) => collection)
  )

  entries.forEach(({ collection: name }, index) => {
    const collection = typeof name === "string" ? collections[name] : undefined

    if (!collection) {
      throw buildConfigError(
        `${where}: route "${slug}" "collection" "${String(name)}" is not a collection`
      )
    }

    const onRoute = entries
      .slice(0, index)
      .some((entry) => entry.collection === collection.slug)

    if (onRoute || taken.includes(collection.slug)) {
      throw buildConfigError(
        `${where}: "${collection.slug}" is on two routes; its documents have one address`
      )
    }
  })

  return entries
}

/**
 * Checks one level of the routes' tree and walks down it.
 *
 * @param routes - The level's routes, as the config gave them.
 * @param parent - The slug of the route whose page the level sits under; none at the top level.
 * @param walk - The collections and the routes placed so far, which this level adds to.
 * @throws At the first route that does not fit.
 */
const pushRouteLevel = (
  routes: unknown,
  parent: string | undefined,
  walk: RouteWalk
): void => {
  const where = parent
    ? `admin "routes" route "${parent}" children`
    : 'admin "routes"'

  // A JS config can give anything here, which the types do not allow.
  if (!Array.isArray(routes)) {
    throw buildConfigError(`${where} must be a list of routes`)
  }

  for (const route of routes as CmsRoute[]) {
    const entry = {
      route,
      parent,
      entries: validateRoute(route, where, walk),
    }

    walk.placed.push(entry)
    walk.bySlug[route.slug] = entry

    if (route.children !== undefined) {
      pushRouteLevel(route.children, route.slug, walk)
    }
  }
}

/**
 * Checks the routes' tree and lists its routes, each with the route it sits under and the collections
 * its page shows: every route has a snake_case slug once in the tree and a list of registered
 * collections that no other route shows.
 *
 * @param routes - The routes, as the config or its function gave them.
 * @param collections - Every collection, by slug.
 * @returns The routes, in the tree's order, parents before their children.
 * @throws At the first route that does not fit.
 */
export const validateRouteNodes = (
  routes: unknown,
  collections: Record<string, PreparedCollection>
): PlacedRoute[] => {
  const walk: RouteWalk = { collections, placed: [], bySlug: {} }

  pushRouteLevel(routes, undefined, walk)

  return walk.placed
}
