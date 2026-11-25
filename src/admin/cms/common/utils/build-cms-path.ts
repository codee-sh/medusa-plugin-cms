/**
 * Builds an Admin address of the CMS from a route's slug: the route's page, or a path under it, as a
 * document's page or a drawer over the page.
 *
 * @param route - The route's slug: a collection's `admin.route`, or the URL's.
 * @param segments - The path under the route's page, if any.
 * @returns The Admin path.
 * @throws When there is no route: a collection on none has no page, which the start keeps from being
 * linked.
 */
export const buildCmsPath = (
  route: string | undefined,
  ...segments: string[]
): string => {
  if (!route) {
    throw new Error("A CMS page needs a route, which this collection has not")
  }

  return ["/cms", route, ...segments].join("/")
}
