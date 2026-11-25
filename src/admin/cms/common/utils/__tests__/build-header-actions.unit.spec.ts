import type { CollectionAction } from "../../../../../lib/config/types"
import { buildHeaderActions } from "../build-header-actions"

/**
 * Builds a collection as far as the util reads it, on a route of its own.
 *
 * @param slug - The collection's slug.
 * @param route - The slug of its route.
 * @param singleton - Whether it holds one document.
 * @returns The collection.
 */
const collectionOf = (slug: string, route: string, singleton = false) => ({
  slug,
  singleton,
  labels: { singular: `${slug} one`, plural: `${slug} all` },
  admin: { route, actions: [], sections: [] },
})

/**
 * Builds the collection whose table shows the buttons.
 *
 * @param actions - Its resolved actions.
 * @returns The collection.
 */
const withActions = (actions: CollectionAction<string>[]) => ({
  admin: { route: "pages", actions, sections: [] },
})

describe("buildHeaderActions", () => {
  const targets = {
    collections: [
      collectionOf("page", "pages"),
      collectionOf("page_settings", "settings", true),
      collectionOf("redirect", "redirects"),
    ],
    routes: [{ slug: "site", label: "Site" }],
  }

  it("turns each action into a button, in the actions' order, a collection's and a route's at the route's page", () => {
    expect(
      buildHeaderActions(
        withActions([
          { type: "link", label: "Import", to: "/import-pages" },
          { type: "collection", collection: "page_settings" },
          { type: "collection", collection: "redirect" },
          { type: "route", route: "site" },
          { type: "create" },
        ]),
        "page",
        targets,
        "Create"
      )
    ).toEqual([
      { label: "Import", to: "/import-pages" },
      { label: "page_settings one", to: "/cms/settings" },
      { label: "redirect all", to: "/cms/redirects" },
      { label: "Site", to: "/cms/site" },
      { label: "Create", to: "tables/page/create" },
    ])
  })

  it("leaves out an action naming a collection or a route the lists lack", () => {
    expect(
      buildHeaderActions(
        withActions([
          { type: "collection", collection: "gone" },
          { type: "route", route: "gone" },
        ]),
        "page",
        targets,
        "Create"
      )
    ).toEqual([])
  })

  it("shows no button for a collection without actions", () => {
    expect(
      buildHeaderActions(withActions([]), "page", targets, "Create")
    ).toEqual([])
  })
})
