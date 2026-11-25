import { buildConfigError } from "../config/build-config-error"
import { prepareCmsText } from "../config/prepare-cms-text"
import { prepareConfigValue } from "../config/prepare-config-value"
import type {
  ClientText,
  CollectionAction,
  CollectionConfig,
} from "../config/types"

/** The types of action the Admin knows how to show. */
const ACTION_TYPES = ["create", "collection", "route", "link"]

/** What an action may name: the collections on a route, and the routes. */
export type ActionTargets = {
  /** The slugs of the collections on a route, whose page a `collection` button opens. */
  collections: string[]
  /** The slugs of every route, whose page a `route` button opens. */
  routes: string[]
}

/**
 * Builds a list collection's default actions: a `route` button per child of its route, in order, then
 * **Create**.
 *
 * @param children - The slugs of the routes under the collection's, when its route shows it alone.
 * @returns The defaults.
 */
const buildDefaultActions = (children: string[]): CollectionAction[] => [
  ...children.map((child) => ({ type: "route" as const, route: child })),
  { type: "create" },
]

/**
 * Checks one action: a known type, a `collection` naming a collection on a route and a `route` naming a
 * route, whose page the button opens, a `link` with a label and an Admin path.
 *
 * @param action - The action, as the config gave it.
 * @param where - The action's place, for error messages.
 * @param targets - The collections on a route and the routes.
 * @throws At the first problem.
 */
const validateAction = (
  action: unknown,
  where: string,
  targets: ActionTargets
): void => {
  const { type, collection, route, label, to } = (action ?? {}) as Record<
    string,
    unknown
  >

  if (typeof type !== "string" || !ACTION_TYPES.includes(type)) {
    throw buildConfigError(
      `${where}: needs a type of ${ACTION_TYPES.join(", ")}`
    )
  }

  if (
    type === "collection" &&
    (typeof collection !== "string" ||
      !targets.collections.includes(collection))
  ) {
    throw buildConfigError(
      `${where}: "collection" "${String(collection)}" is no collection on a route, whose page the button would open`
    )
  }

  if (
    type === "route" &&
    (typeof route !== "string" || !targets.routes.includes(route))
  ) {
    throw buildConfigError(`${where}: "route" "${String(route)}" is no route`)
  }

  // A label is a text or a function of the config, which prepareCmsText checks once this passes.
  const hasLabel =
    typeof label === "function" ||
    (typeof label === "string" && Boolean(label.trim()))

  if (
    type === "link" &&
    (!hasLabel || typeof to !== "string" || !to.startsWith("/"))
  ) {
    throw buildConfigError(
      `${where}: a link needs a "label" and a "to" starting with "/"`
    )
  }
}

/**
 * Checks that a singleton names no actions, as its page has no header.
 *
 * @param configured - The config's `admin.actions`.
 * @param path - Where the config sits, for error messages.
 * @throws When it names some.
 */
const validateSingletonActions = (configured: unknown, path: string): void => {
  if (configured) {
    throw buildConfigError(
      `${path}: a singleton takes no admin "actions", as its page has no header`
    )
  }
}

/**
 * Checks the actions of a collection's header: a list, each action as `validateAction` takes it, and
 * **Create** once.
 *
 * @param actions - The actions, as the config or its function gave them.
 * @param targets - The collections on a route and the routes.
 * @param path - Where the config sits, for error messages.
 * @returns The actions.
 * @throws At the first problem.
 */
const validateActions = (
  actions: unknown,
  targets: ActionTargets,
  path: string
): CollectionAction[] => {
  if (!Array.isArray(actions)) {
    throw buildConfigError(`${path}: admin "actions" must be a list of actions`)
  }

  actions.forEach((action, index) =>
    validateAction(action, `${path}: admin "actions" [${index}]`, targets)
  )

  if (actions.filter(({ type }) => type === "create").length > 1) {
    throw buildConfigError(`${path}: admin "actions" holds "create" twice`)
  }

  return actions as CollectionAction[]
}

/**
 * Resolves the buttons in the header of a collection's table: for a list collection, its defaults - a
 * `route` button per child of its route, then **Create** - or the config's `actions`, a list replacing them or a
 * function of them, run once; for a singleton, none, as its page has no header.
 *
 * @param config - The collection's config.
 * @param children - The slugs of the routes under the collection's, when its route shows it alone.
 * @param targets - The collections on a route and the routes, which an action may name.
 * @param translationNs - The config's `admin.translationNs`, which a link's label's `t` takes.
 * @param path - Where the config sits, for error messages.
 * @returns The actions, a link's label prepared.
 * @throws When a singleton names actions, the function throws or returns anything but a list of
 * actions, an action is not a known type, names no collection on a route or no route, or is a link without a label or an Admin
 * path, or the list holds **Create** twice.
 */
export const prepareCollectionActions = (
  config: CollectionConfig,
  children: string[],
  targets: ActionTargets,
  translationNs: string | undefined,
  path: string
): CollectionAction<ClientText>[] => {
  const configured = config.admin?.actions

  if (config.singleton) {
    validateSingletonActions(configured, path)

    return []
  }

  const defaults = buildDefaultActions(children)
  // The function gets a copy, so it cannot change the defaults; its result is checked below.
  const actions = validateActions(
    prepareConfigValue(
      configured ?? defaults,
      { defaultActions: [...defaults] },
      `${path}: the admin "actions" function`
    ),
    targets,
    path
  )

  return actions.map((action, index) =>
    action.type === "link"
      ? {
          ...action,
          label: prepareCmsText(
            action.label,
            translationNs,
            `${path}: admin "actions" [${index}] label`
          ),
        }
      : action
  )
}
