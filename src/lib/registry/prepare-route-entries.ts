import { buildConfigError } from "../config/build-config-error"
import { prepareCmsText } from "../config/prepare-cms-text"
import type { CmsRouteEntryConfig } from "../config/types"
import {
  type EntryTableContext,
  prepareEntryTable,
} from "./prepare-entry-table"
import type { RegistryRouteEntry } from "./types"
import type { PlacedRoute } from "./validate-route-nodes"

/** The keys of a list's entry that a singleton's entry leaves out: its column, heading and table. */
const LIST_KEYS = [
  "position",
  "label",
  "description",
  "columns",
  "defaultSort",
  "pageSize",
  "filters",
]

/**
 * Resolves a singleton's entry: its key alone, as its sections keep their own columns and headings and
 * it has no table.
 *
 * @param entry - The entry, as the config gave it.
 * @param key - The entry's key, its default filled in.
 * @param where - The entry's place, for error messages.
 * @returns The entry.
 * @throws When it gives a list's key.
 */
const prepareSingletonEntry = (
  entry: CmsRouteEntryConfig,
  key: string,
  where: string
): RegistryRouteEntry => {
  const given = LIST_KEYS.filter(
    (name) => (entry as Record<string, unknown>)[name] !== undefined
  )

  if (given.length) {
    throw buildConfigError(
      `${where} is a singleton, whose sections keep their own columns and headings and which has no table: leave ${given.join(", ")} out`
    )
  }

  return { collection: entry.collection, key }
}

/**
 * Resolves a list's entry: its key, its column, `main` by default, its table's heading and description
 * when given, and its table, the collection's own with the entry's settings in place.
 *
 * @param entry - The entry, as the config gave it.
 * @param key - The entry's key, its default filled in.
 * @param where - The entry's place, for error messages.
 * @param context - The collections, their configs and the namespace.
 * @returns The entry.
 * @throws When its column is neither `main` nor `side`, a text does not fit, or its table does not fit.
 */
const prepareListEntry = (
  entry: CmsRouteEntryConfig,
  key: string,
  where: string,
  context: EntryTableContext
): RegistryRouteEntry => {
  const position = entry.position ?? "main"

  if (position !== "main" && position !== "side") {
    throw buildConfigError(`${where} "position" must be main or side`)
  }

  return {
    collection: entry.collection,
    key,
    position,
    ...(entry.label !== undefined && {
      label: prepareCmsText(
        entry.label,
        context.translationNs,
        `${where} label`
      ),
    }),
    ...(entry.description !== undefined && {
      description: prepareCmsText(
        entry.description,
        context.translationNs,
        `${where} description`
      ),
    }),
    table: prepareEntryTable(entry.collection, entry, where, context),
  }
}

/**
 * Resolves the collections a route's page shows: each entry's key, the collection's slug unless given,
 * a list's column, heading and table, a singleton's key alone; and checks every key once on the page,
 * as a table's address names it.
 *
 * @param placed - The route, with its entries as objects.
 * @param context - The collections, their configs and the namespace.
 * @returns The entries, in order.
 * @throws At the first entry that does not fit, or a key the page names twice.
 */
export const prepareRouteEntries = (
  { route, entries }: PlacedRoute,
  context: EntryTableContext
): RegistryRouteEntry[] => {
  const where = `admin "routes" route "${route.slug}"`
  const seen: string[] = []

  return entries.map((entry) => {
    const at = `${where} collection "${entry.collection}"`
    const key = entry.key ?? entry.collection

    // A JS config can give anything here, which the types do not allow.
    if (typeof key !== "string" || !key.trim()) {
      throw buildConfigError(`${at} needs a "key" of text`)
    }

    if (seen.includes(key)) {
      throw buildConfigError(
        `${at} takes the key "${key}", which another collection of the page has: give one a "key" of its own`
      )
    }

    seen.push(key)

    return context.collections[entry.collection].singleton
      ? prepareSingletonEntry(entry, key, at)
      : prepareListEntry(entry, key, at, context)
  })
}
