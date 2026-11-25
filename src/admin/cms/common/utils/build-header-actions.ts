import type { ClientCollection } from "../../../../lib/collection/types"
import type { RegistryRoute } from "../../../../lib/registry/types"
import { buildCmsPath } from "./build-cms-path"
import { collectionPageLabel } from "./collection-page-label"

/** A button in the header of a `DataTable`: its label and where it goes. */
export type HeaderAction = { label: string; to: string }

/** What a list's header buttons name besides the list: the collections and the routes. */
export type HeaderActionTargets = {
  collections: Pick<
    ClientCollection,
    "slug" | "singleton" | "labels" | "admin"
  >[]
  routes: Pick<RegistryRoute<string>, "slug" | "label">[]
}

/**
 * Turns a list's resolved actions into the buttons of its table's header: **Create** opens the create
 * modal of the list's table, named by its key on the page; a collection's action its route's page under
 * its page label; a route's action its page under the route's label; a link its path under its label.
 *
 * @param collection - The list whose table shows the buttons.
 * @param table - The table's key on the route's page.
 * @param targets - The collections and the routes an action names.
 * @param createLabel - The dashboard's label of **Create**, in the Admin's language.
 * @returns The buttons, in the actions' order; an action naming a collection or a route the list lacks
 * is left out.
 */
export const buildHeaderActions = (
  collection: Pick<ClientCollection, "admin">,
  table: string,
  { collections, routes }: HeaderActionTargets,
  createLabel: string
): HeaderAction[] =>
  collection.admin.actions.flatMap((action): HeaderAction[] => {
    if (action.type === "create") {
      return [{ label: createLabel, to: `tables/${table}/create` }]
    }

    if (action.type === "link") {
      return [{ label: action.label, to: action.to }]
    }

    if (action.type === "route") {
      const route = routes.find(({ slug }) => slug === action.route)

      return route ? [{ label: route.label, to: buildCmsPath(route.slug) }] : []
    }

    const target = collections.find(({ slug }) => slug === action.collection)

    return target
      ? [
          {
            label: collectionPageLabel(target),
            to: buildCmsPath(target.admin.route),
          },
        ]
      : []
  })
