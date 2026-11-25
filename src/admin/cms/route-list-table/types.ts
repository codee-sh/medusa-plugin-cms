/** A row of a list of routes: a route of **Content**, or a route under another. */
export type RouteRow = {
  /** The route's slug, its page's address. */
  slug: string
  /** The page's name: the route's label. */
  name: string
  description?: string
  /** The number of documents of a route that shows one list; none for any other route. */
  count?: number
}
